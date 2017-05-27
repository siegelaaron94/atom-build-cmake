'use babel';
'use strict';
import {spawn} from 'child_process';

/**
 */
export default class CMakeServer {
  /**
   * @param {string} cmakeExecutable
   * @param {path} sourceDirectory
   * @param {path} buildDirectory
   */
  constructor(cmakeExecutable, sourceDirectory, buildDirectory) {
    this.cmakeExecutable = cmakeExecutable;
    this.sourceDirectory = sourceDirectory;
    this.buildDirectory = buildDirectory;
    this.cmakeServer = spawn(
        this.cmakeExecutable, ['-E', 'server', '--experimental', '--debug']);

    this.chunks = [];
    this.responses = [];
    this.listeners = [];
    const that = this;
    this.cmakeServer.stdout.on('data', (chunk) => {
      that.chunks = that.chunks.concat(chunk.toString('utf8').split('\n'));

      while (true) {
        const startIndex = that.chunks.indexOf('[== "CMake Server" ==[');
        const endIndex = that.chunks.indexOf(']== "CMake Server" ==]');
        if (startIndex >= 0 && endIndex >= 0 && endIndex > startIndex) {
          let response = that.chunks.slice(startIndex + 1, endIndex)
                             .reduce((str, line) => str + line, '');
          that.chunks = that.chunks.splice(endIndex + 1);
          response = JSON.parse(response);
          if (response.type !== 'progress' && response.type !== 'message') {
            that.responses.push(response);
          }
        } else {
          break;
        }
      }

      while (that.responses.length > 0 && that.listeners.length > 0)
        (that.listeners.shift())(that.responses.shift());
    });

    this.cmakeServer.stderr.on('data', (chunk) => {
      console.log(chunk.toString('utf8'));
    });


    this.cmakeServer.on('close', (code) => {
      console.log('cmake server closed with code ${code}');
    });
  }

  /**
   * @param {CMakeMessage} message
   * @return {Promise}
   */
  getServerResponse(message) {
    const that = this;
    return new Promise((resolve, reject) => {
      that.listeners.push((response) => {
        if (response.type === 'error')
          reject(response);
        else
          resolve(response);
      });
      if (message != null) {
        that.cmakeServer.stdin.write(
            '\n[== "CMake Server" ==[\n' + JSON.stringify(message) +
            '\n]== "CMake Server" ==]\n');
      }
    });
  }

  /**
   * @return {Promise}
   */
  configure() {
    const that = this;
    return that.getServerResponse()
        .then((connectionResponse) => {
          // TODO do find the best protocol version not just
          // the first one.
          that.protocol = connectionResponse.supportedProtocolVersions[0];
          return that.getServerResponse({
            cookie: 'zimtstern',
            type: 'handshake',
            protocolVersion: that.protocol,
            sourceDirectory: that.sourceDirectory,
            buildDirectory: that.buildDirectory,
            generator: 'Unix Makefiles',
          });
        })
        .then((handshakeResponse) => {
          return that.getServerResponse({type: 'configure'});
        })
        .then((configureResponse) => {
          return that.getServerResponse({type: 'compute'});
        })
        .then((computeResponse) => {
          that.configured = true;
          return that;
        });
  }

  /**
   * @return {Promise}
   */
  getCodeModel() {
    return this.getServerResponse({type: 'codemodel'});
  }
}
