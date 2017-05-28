'use babel';
'use strict';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import CMakeServer from './cmake-server';

const generateErrorMatch =
    ['(.+\n)?CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)'];

const generateWarningMatch =
    ['(.+\n)?CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)'];

/**
 */
export default class CMakeServerBuildProvider extends EventEmitter {
  /**
   * @param {path} projectDirectory the project source directory.
   **/
  constructor(projectDirectory) {
    super();
    this.cmakeExecutable = 'cmake';
    this.cmakeArguments = ['-DCMAKE_COLOR_MAKEFILE=ON'];
    this.projectDirectory = projectDirectory;
    this.sourceDirectory = projectDirectory;
    this.buildDirectory = path.join(this.sourceDirectory, 'build');
    this.cacheFile = path.join(this.buildDirectory, 'CMakeCache.txt');
    this.parallelBuild = true;
    this.buildArguments = [];
  }

  /**
   * @return {string} the nice readable name of this provider.
   */
  getNiceName() {
    return 'cmake';
  }

  /**
   * @return {bool} determine the project in `sourceDirectory` is a cmake
   * project.
   */
  isEligible() {
    return fs.existsSync(path.join(this.sourceDirectory, 'CMakeLists.txt')) ||
        fs.existsSync(this.cacheFile);
  }

  /**
   * @param {CMakeServerTarget} target
   * @return {AtomBuildCommand}
   */
  createMakefileTarget(target) {
    argumentList =
        ['--build', this.buildDirectory, '--target', target.name, '--'];
    if (this.parallelBuild) argumentList.push('-j' + os.cpus().length);
    return {
      atomCommandName: 'cmake:' + target.name,
      name: target.name,
      exec: this.cmakeExecutable,
      cwd: this.buildDirectory,
      args: argumentList.concat(this.buildArguments),
      errorMatch: generateErrorMatch,
      warningMatch: generateWarningMatch,
    };
  }

  /**
   * @param {CMakeServerCodeModel} codemodel
   * @return {Array} atom-build build commands
   */
  extractTargets(codemodel) {
    let args = this.cmakeArguments.concat([
      '-B' + this.buildDirectory,
      '-H' + this.sourceDirectory,
      '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON',
    ]);
    // Add custom generator if specified.
    if (!!this.generator) {
      args.unshift('-G' + this.generator);
    }

    const generateTarget = {
      atomCommandName: 'cmake:generate',
      name: 'generate',
      exec: this.cmakeExecutable,
      cwd: this.sourceDirectory,
      args: args,
      errorMatch: generateErrorMatch,
      warningMatch: generateWarningMatch,
    };


    return [generateTarget, this.createMakefileTarget({name: 'all'})].concat(
        codemodel.configurations.reduce(
            (targets, configuration) => configuration.projects.reduce(
                (targets, project) => targets.concat(project.targets.map(
                    (target) => this.createMakefileTarget(target))),
                targets),
            []));
  }

  /**
   * @return {Promise}
   */
  settings() {
    const that = this;
    if (this.cmakeServer == null) {
      return new CMakeServer(
                 that.cmakeExecutable, this.sourceDirectory,
                 that.buildDirectory)
          .configure()
          .then((cmakeServer) => {
            that.cmakeServer = cmakeServer;
            return that.cmakeServer.getCodeModel();
          })
          .then((codemodel) => {
            return that.extractTargets(codemodel);
          });
    } else {
      return that.cmakeServer.getCodeModel().then((codemodel) => {
        return that.extractTargets(codemodel);
      });
    }
  }
};
