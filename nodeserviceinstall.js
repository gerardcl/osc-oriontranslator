    var Service = require('node-mac').Service;

    // Create a new service object
    var svc = new Service({
      name:'OSC-ORION translator',
      description: 'OSC ORION translator middleware.',
      script: require('path').join(__dirname,'serverOSCtranslator.js')
    });

    // Listen for the "install" event, which indicates the
    // process is available as a service.
    svc.on('install',function(){
      svc.start();
    });

    svc.install();
