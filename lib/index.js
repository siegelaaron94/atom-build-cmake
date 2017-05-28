'use babel';
'use strict';
import {exec} from 'child_process';
import CMakeServerBuildProvider from './cmake-server-build-provider';

/**
 * @param {string} cmakeExecutable
 * @return {Promise}
 */
function extractCMakeGenerators(cmakeExecutable) {
  cmakeExecutable = cmakeExecutable.trim();
  return new Promise((resolve, reject) => {
    exec('"' + cmakeExecutable + '" --help', (err, stdout, stderr) => {
      if (err || stderr.length > 0) {
        reject('failed to execute!');
      } else {
        generators = stdout.toString('utf8').match(/.*\s*=\s*Generates.*/g);
        if (generators)
          resolve(generators.map((line) => line.split('=')[0].trim()));
        else
          reject('failed to produce generators!');
      }
    });
  });
}

export default {
  config: {
    executable: {
      title: 'CMake Executable',
      description: 'Path to the CMake executable.',
      type: 'string',
      default: 'cmake',
      order: 1,
    },
    generator: {
      title: 'Generator',
      description: 'The CMake generator to use.',
      type: 'string',
      default: 'System Default',
      order: 2,
      enum: [
        'System Default',
        'Unix Makefiles',
        'Ninja',
        'Watcom WMake',
        'CodeBlocks - Ninja',
        'CodeBlocks - Unix Makefiles',
        'CodeLite - Ninja',
        'CodeLite - Unix Makefiles',
        'Sublime Text 2 - Ninja',
        'Sublime Text 2 - Unix Makefiles',
        'Kate - Ninja',
        'Kate - Unix Makefiles',
        'Eclipse CDT4 - Ninja',
        'Eclipse CDT4 - Unix Makefiles',
        'KDevelop3',
        'KDevelop3 - Unix Makefiles',
      ],
    },
    useCMakeServer: {
      title: 'Use CMake Server',
      description: 'Use the new cmake server mode that was added in cmake ' +
          '3.7, to extract targets.',
      type: 'boolean',
      default: false,
      order: 3,
    },
  },
  activate() {
    require('atom-package-deps').install('build-cmake');
    atom.config.observe('build-cmake.executable', (value) => {
      atom.config.transact(() => {
        const cmakeExecutable = value.trim();
        return extractCMakeGenerators(cmakeExecutable)
            .then((generators) => {})
            .catch((error) => {
              atom.notifications.addError(
                  'Invalid CMake executable \'' + cmakeExecutable + '\', ' +
                  error);
            });
      });
    });
  },
  providingFunction() {
    return CMakeServerBuildProvider;
  },
};
