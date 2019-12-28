'use babel';
'use strict';

import fs from 'fs';
import path from 'path';
import glob from 'glob';
import {spawn} from 'child_process';

export default class CMake {
	constructor(executable) {
		this.executable = executable.trim();
	}

	grepStdout(command, commandArguments, outputRegex, callback, outputMessage, prefilter) {
		return new Promise((resolve, reject) => {
			let child = spawn(command, commandArguments, {shell: false});
			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data) => {
				stdout = stdout + data.toString('utf8');
			});

			child.stderr.on('data', (data) => {
				stderr = stderr + data.toString('utf8');
			});

			child.on('close', (code) => {
				if (code !== 0) {
					reject(stderr.replace('/bin/sh: ', '').trim() + '!');
				} else {
					if (prefilter)
						stdout = prefilter(stdout);

					let matches = [];
					let match = outputRegex.exec(stdout);
					while (match !== null) {
						matches = matches.concat(callback(match));
						match = outputRegex.exec(stdout);
					}

					if (outputMessage !== null && matches.length <= 0)
						reject(outputMessage);
					else
						resolve(matches);
				}
			});
		});
	}

	supportedGenerators() {
		return this.grepStdout(
			this.executable, ['--help'],
			/\*?\s+(\S.+)\s+=\s+Generates?\s(\S.+\.)(\s+Optional\s\[arch\]\scan\sbe\s("\S.+")\.)?/g,
			(match) => {
				if (match[4]) {
					const arches = match[4].split('or').map((arch) => arch.replace(/"/g, ''));
					return arches.map((arch) => match[1].replace(/\[arch\]/g, arch).trim());
				} else {
					return [match[1].trim()];
				}
			},
			'The executable "' + this.executable + '" failed to produce generators!',
			(stdout) => {
				return stdout.substring(stdout.indexOf('Generators'));
			});
	}

	makeFileTargets(configuration) {
		return this.grepStdout(
			this.executable, ['--build', configuration.buildRoot, '--target', 'help'],
			/\.{3}\s(.[^\s]+)/g, (match) => {
				return [match[1].trim()];
			});
	}

	ninjaTargets(configuration) {
		return this.grepStdout(
			this.executable, ['--build', configuration.buildRoot, '--', '-t', 'targets'],
			/(.+):/g,
			(match) => {
				return [match[1].trim()];
			})
			.then((targets) => {
				return this.grepStdout(
					this.executable,
					['--build', configuration.buildRoot, '--', '-t', 'query', 'all'],
					/^\s{4}(.*)$/gm,
					(match) => {
						return [match[1].trim()];
					})
					.then((allTargets) => {
						return targets.concat(allTargets);
					});
			});
	}

	visualStudioTargets(configuration) {
		return new Promise((resolve, reject) => {
			glob(
				'**/*.vcxproj', {
					cwd: configuration.buildRoot,
					nodir: true,
					ignore: 'CMakeFiles/**',
				},
				(error, files) => {
					if (error)
						reject(error);
					else
						resolve(files.map((file) => path.basename(file, '.vcxproj')).concat(['clean']));
				});
		});
	}

	extractTargets(configuration) {
		if (!fs.existsSync(configuration.cmakeCacheFile))
			return Promise.resolve([]);
		else if (configuration.generator.match('Visual Studio'))
			return this.visualStudioTargets(configuration);
		else if (configuration.generator.match('Ninja'))
			return this.ninjaTargets(configuration);
		else if (configuration.generator.match('Makefiles'))
			return this.makeFileTargets(configuration);
		else
			return Promise.reject({message: `Cannot extract targets for generator "${configuration.generator}"`});
	}
}
