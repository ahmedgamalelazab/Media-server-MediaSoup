const os = require('os'); //node core package . . . .

module.exports.config = {
  listenIp: '0.0.0.0',
  listenPort: 3016,

  //mediasoups configurations
  mediasoup: {
    numWorks: Object.keys(os.cpus()).length, // how many works

  //updated the worker settings 
    worker: {
      rtcMinPort: 2000,
      rtcMaxPort: 2020,
      logLevel: 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },

    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },

    //webrtc transport settings

    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          // announcedIp:'192.168.48.2' //not the container ip address but the host machine ip address
          announcedIp: '127.0.0.1', //not the container ip address but the host machine ip address
        },
      ],
      maxIncomeBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};
