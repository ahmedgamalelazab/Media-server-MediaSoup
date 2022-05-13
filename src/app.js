const {http , httpsServer} = require('./server/core');

// const PORT = process.env.PORT || 12555;

//testing

httpsServer.listen(3000,()=>{
    console.log("server is on and listening on port "+3000+"");
})

http.listen(12555, () => {
  console.log('server is on and listening on port :  ' + 12555 + '');
});
