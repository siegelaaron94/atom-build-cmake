'use babel';

// export default {
//   executable: {
//     title: 'CMake Executable',
//     description: 'Path to the CMake executable.',
//     type: 'string',
//     default: 'cmake',
//     order: 1,
//   },
//   cmakelists: {
//     title: 'CMakeLists',
//     description: 'Relative path to the CMakeLists file.',
//     type: 'string',
//     default: '',
//     order: 2,
//   },
//   generator: {
//     title: 'Generator',
//     description: 'The default CMake generator.',
//     type: 'string',
//     default: '',
//     order: 3,
//     enum: [''],
//   },
//   cmakeArguments: {
//     title: 'Custom CMake Arguments',
//     description: 'Arguments passed to CMake during the generator phase.',
//     type: 'string',
//     default: ' -DCMAKE_BUILD_TYPE=Debug ',
//     order: 4,
//   },
//   buildDirectory: {
//     title: 'Build Location',
//     description: 'The build directory. The following variables can be used: '
//     +
//         '' +
//         '<br>`TMPDIR` - The operating system\'s default temp directory' +
//         '<br>`PROJECT_DIR` - Current project directory' +
//         '<br>`PROJECT_DIRNAME` - Current project directory name' +
//         '<br> \n',
//     type: 'string',
//     default: '$PROJECT_DIR-build',
//     order: 5,
//   },
//   buildArguments: {
//     title: 'Custom Build Tool Arguments',
//     description:
//         'Arguments passed to the build tool while compiling the project.',
//     type: 'string',
//     default: '',
//     order: 6,
//   },
//   parallelBuild: {
//     title: 'Parallel Build',
//     description: 'Enables or disables parallel building using multiple
//     cores.', type: 'boolean', default: true, order: 7,
//   },
// };
