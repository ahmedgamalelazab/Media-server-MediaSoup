const express = require('express');

const https = require('https');

const path = require('path');

const app = express();

const http = require('http').Server(app);

const { types } = require('mediasoup');

const mediasoup = require('mediasoup');

const {config} = require('../config/mediasoupConfig');


const fs = require('fs');

//secure the server in order control the voice

const options = {
  key: fs.readFileSync(path.join(__dirname,'../ssl/key.pem'), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname,'../ssl/cert.pem'), 'utf-8'),
  // cert:fs.readFileSync('../ssl/cert.pem','utf-8')
};

//registering io

app.get('/', (req, res, next) => {
  console.log('hello world');
  res.status(200).json({
    success: true,
    message: 'welcome from mediasoup app',
  });
});

const httpsServer = https.createServer(options, app);


const {Server} = require('socket.io');


const io = new Server(httpsServer,{
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})


//STEP 1 1️⃣ DECLARE AND DEFINE THE WORKER 

/**
 * @type {types.Worker}
 */
let worker;

//STEP 2 2️⃣ DECLARE AND DEFINE THE ROUTER 
 
/**
 * @type {types.Router}
 */
let router;

/**
 * @type {types.WebRtcTransport}
 */
let producerTransport;

/**
 * @type {types.WebRtcTransport}
 */
let consumerTransport;

//server side producer
/**
 * @type {types.Producer}
 */
let producer;

//server side Consumer
/**
 * @type {types.Consumer}
 */
let consumer;



/**
 * 
 * @returns {types.Worker}
 */
const createWorker = async ()=>{
  worker = await mediasoup.createWorker({
     rtcMinPort : config.mediasoup.worker.rtcMinPort,
     rtcMaxPort:config.mediasoup.worker.rtcMaxPort,
     logLevel:config.mediasoup.worker.logLevel,
     logTags:config.mediasoup.worker.logTags
  })

  console.log(`worker PID is : ${worker.pid}`);

  worker.on('died',()=>{
    console.error(`mediasoup worker ahs died`);
    setTimeout(()=>{
      process.exit(1);
    },2000)
  })

  return worker;

} 

worker = createWorker();



//handling socket connections 
io.on('connection',async(socket)=>{

  console.log(socket.id);
  socket.emit("message",{
    type:'connection-success',
    data:socket.id
  })

  socket.on("message",async(message)=>{
      //handle all the client messages
      switch (message.type) {
        case "getRtpCapabilities":
          //then give him the rtpCapabilities            
          socket.emit("message",{
            type:"serverWithResponseRtpCapabilities",            
            data:router.rtpCapabilities
          })
        break; 
        case "createWebRTCtransport":
            //data will represent the client params
          if(message.sender){
             try{
                 //that's mean the request from a producer client
              //create the producer transport
              const webrtcTransportOptions = {
                listenIps: [
                   {
                      ip: '0.0.0.0',
                      announcedIp: '127.0.0.1', //not the container ip address but the host machine ip address
                   }
                ],
                enableUdp:true,
                enableTcp:true,
                preferUdp:true,
            }
              //create the webrtc transport
              producerTransport = await router.createWebRtcTransport(webrtcTransportOptions);

              console.log("transport id : "+producerTransport.id+"");

              producerTransport.on('dtlsstatechange',dtlsState=>{
                  if(dtlsState === 'closed'){
                    producerTransport.close();
                  }
              })

              producerTransport.on("close",()=>{
                  console.log("transport closed");
              })


              //if all are ok then emit those changes to the client

              socket.emit("message",{
                type:"createdWebRTCtransport",
                params:{
                  id:producerTransport.id,
                  iceParameters : producerTransport.iceParameters,
                  iceCandidates:producerTransport.iceCandidates,
                  dtlsParameters : producerTransport.dtlsParameters
                }
              })

             }catch(error){
                socket.emit("message",{
                  type:"createdWebRTCtransport",
                  params:{
                    error:error
                  }
                })
             }

          }else{
            //that's mean the request from consumer client
            try{
              //that's mean the request from a producer client
           //create the producer transport
           const webrtcTransportOptions = {
             listenIps: [
                {
                   ip: '0.0.0.0',
                   announcedIp: '127.0.0.1', //not the container ip address but the host machine ip address
                }
             ],
             enableUdp:true,
             enableTcp:true,
             preferUdp:true,
         }
           //create the webrtc transport
           consumerTransport = await router.createWebRtcTransport(webrtcTransportOptions);

           console.log("consumer transport id : "+consumerTransport.id+"");

           consumerTransport.on('dtlsstatechange',dtlsState=>{
               if(dtlsState === 'closed'){
                 consumerTransport.close();
               }
           })

           consumerTransport.on("close",()=>{
               console.log("transport closed");
           })


           //if all are ok then emit those changes to the client

           socket.emit("message",{
             type:"createdWebRTCtransport",
             params:{
               id:consumerTransport.id,
               iceParameters : consumerTransport.iceParameters,
               iceCandidates:consumerTransport.iceCandidates,
               dtlsParameters : consumerTransport.dtlsParameters
             }
           })

          }catch(error){
             socket.emit("message",{
               type:"createdWebRTCtransport",
               params:{
                 error:error
               }
             })
          }
          }
        break;    
        case "transport-connect" : 
          console.log(JSON.stringify(message.params));
          await producerTransport.connect({
              dtlsParameters : message.params.dtlsParameters
          })
        break;
        case "transport-produce":
          producer = await producerTransport.produce({
            kind:message.params.kind,
            rtpParameters:message.params.rtpParameters
          })
         
          console.log(`producer id : ${producer.id} producer kind : ${producer.kind}`);
          //listen on the server producer events 
          producer.on('transportclose',()=>{
            console.log("server producer closed !");
            producer.close();
          })          

           //very important to match with the client
           socket.emit("message",{
            type:"serverProducerId",
            id:producer.id
          })
        break;
        case "transport-recv-connect":
          console.log(JSON.stringify(message.params));
          await consumerTransport.connect({
            dtlsParameters : message.params.dtlsParameters
          })
          break;
        case "consume":
            try{
              if(router.canConsume({
                producerId : producer.id,
                rtpCapabilities: message.rtpCapabilities,
              })){
                consumer = await consumerTransport.consume({
                  producerId : producer.id,
                  rtpCapabilities: message.rtpCapabilities,
                  paused:true,
                })

                consumer.on('transportclose',()=>{
                  console.log("transport close from consumer");
                  
                })

                consumer.on('producerclose',()=>{
                  console.log("producer of consumer is closed");

                })

                socket.emit("message",{
                  type:"onsServerParams",
                  params:{
                    id:consumer.id,
                    producerId:producer.id,
                    kind: consumer.kind,
                    rtpParameters : consumer.rtpParameters
                  }
                })

              }

            }catch(error){
                console.log(error);
                socket.emit("message",{
                  type:"onsServerParams",
                  params:{
                    error:error
                  }
                })
            }

          break;
          case "consumer-resume":
              console.log("consumer resume");
              await consumer.resume();
            break;
        default:
          break;
      }


  })

  //handling the client when disconnected 
  socket.on('disconnect',()=>{
    console.log("client has been disconnected"+socket.id+"");
    //do some cleanup
  })

  //on connection we will create the router 

  router = await worker.createRouter({
    mediaCodecs : config.mediasoup.router.mediaCodecs
  })


})





module.exports = { http, httpsServer };
// module.exports = http;
