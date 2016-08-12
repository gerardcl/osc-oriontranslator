
//TODO:
// - to ...

var osc         = require('osc');
var Client      = require('node-rest-client').Client;

var client = new Client();
var orionBaseURL = "http://178.62.205.167:1026"
//var orionBaseURL = "http://192.168.99.100:1026"

//////////////
// OSC
//////////////
var oscPort = new osc.UDPPort({
//  localAddress: "172.17.11.24",
  localAddress: "127.0.0.1",
  localPort: 9001,
//  remoteAddress: "172.17.11.24",
  remoteAddress: "127.0.0.1",
  remotePort: 9000
});
oscPort.open();

var scenario1 = 0;
var scenario2 = 0;

oscPort.on("message", function (oscBundle, timeTag, info) {
  //console.log(oscBundle);

  try{

    //console.log(oscBundle.address);
    //console.log(oscBundle.args);
    if(oscBundle.address =="/cbodies") {
      // osc message /cbodies {secenario_id} {sensortype} {pintype} {pin} {value}
      // /cbodies/Scenario1/analog/IN/2 125
      var scenario_id = "";
      var sensortype = "";
      var pintype = "";
      var pin = "";
      var value = "";
      //console.log(oscBundle.args.length);

      if(oscBundle.args.length>0) {
        scenario_id = oscBundle.args[0];
      }
      if(oscBundle.args.length>1) {
        sensortype = oscBundle.args[1];
      }
      if(oscBundle.args.length>2) {
        pintype = oscBundle.args[2];
      }
      if(oscBundle.args.length>3) {
        pin = oscBundle.args[3];
      }
      if(oscBundle.args.length>4) {
        value = oscBundle.args[4];
      }

      if(pin!="") {
        //console.log("Redirect from pin");
        translateGETQueryToOrion(scenario_id,sensortype,pintype,pin, function(response){
          //console.log(response);
          //console.log(response.contextResponses[0].contextElement.attributes);
        });
      } else {
        if(pintype!=""){
          //console.log("Redirect from pintype");
          translateGETQueryToOrion(scenario_id,sensortype,pintype,'all', function(response){
            //console.log(response);
          });
        }  else {
          if(sensortype!=""){
            //console.log("Redirect from sensortype");
            translateGETQueryToOrion(scenario_id,sensortype,'all','all', function(response){
              //console.log(response);
            });
          } else {
            if(scenario_id!=""){
              //console.log("Redirect from scenario");
              translateGETQueryToOrion(scenario_id,'all','all','all', function(response){
                //console.log(response);
              });
            } else {
              //console.log("Redirect from scenario");
              translateGETQueryToOrion('all','all','all','all', function(response){
                //console.log(response);
              });
            }
          }
        }
      }
    }
    //SCENARIO 2
    else if (oscBundle.address == "/s1/scena") {
      var scenario_id = "Scenario1";
      var sensortype = "analog";
      var pintype = "IN";
      var pin = "1";
      var newvalue = "";

      if(oscBundle.args.length>0) {
        newvalue = oscBundle.args[0];
        translatePOSTQueryToOrion(scenario_id,sensortype,pintype,pin,newvalue, function(response){
          //console.log(response.contextResponses[0].contextElement.attributes);
          //console.log("Setting scenario1 to: "+ newvalue);
          translateGETQueryToOrion("Scenario2","analog","IN","1", function(response){
            //console.log("Checking scenario 2 changes...")
            val = response.contextResponses[0].contextElement.attributes[0].value;
            if ( scenario2 != val){
              //console.log("Scenario2 changed to: "+ val );
              scenario2 = val;
              oscPort.send({
                address: "/s2/scena",
                args: [{type: "i",value: scenario2}]
              });
            }// else console.log("No change for scenario2.");
          });
        });
      }
    }
    //SCENARIO 1
    else if (oscBundle.address == "/s2/scena") {
      var scenario_id = "Scenario2";
      var sensortype = "analog";
      var pintype = "IN";
      var pin = "1";
      var newvalue = "";

      if(oscBundle.args.length>0) {
        newvalue = oscBundle.args[0];
        translatePOSTQueryToOrion(scenario_id,sensortype,pintype,pin,newvalue,function(response){
          //console.log(response.contextResponses[0].contextElement.attributes);
          //console.log("Setting scenario1 to: "+ newvalue);
          translateGETQueryToOrion("Scenario1","analog","IN","1", function(response){
            //console.log("Checking scenario 1 changes...")
            val = response.contextResponses[0].contextElement.attributes[0].value;
            if ( scenario1 != val){
              //console.log("Scenario1 changed to: "+ val );
              scenario1 = val;
              oscPort.send({
                address: "/s1/scena",
                args: [{type: "i",value: scenario1}]
              });
            }// else console.log("No change.");
          });
        });
      }
    } else {

      //console.log(oscBundle.address);

    }
  } catch(e){ /*console.log("ERROR!!!!"); console.log(e)*/ }
});

var interval = setInterval(function() {
   translateGETQueryToOrion("Scenario1","analog","IN","1", function(response){
     val = response.contextResponses[0].contextElement.attributes[0].value;
     if ( scenario1 != val){
       //console.log("Scenario1 changed to: "+ val );
       scenario1 = val;
       oscPort.send({
         address: "/s1/scena",
         args: [{type: "f",value: scenario1}]
       });
     }
   });
   translateGETQueryToOrion("Scenario2","analog","IN","1", function(response){
     val = response.contextResponses[0].contextElement.attributes[0].value;
     if ( scenario2 != val){
       //console.log("Scenario2 changed to: "+ val );
       scenario2 = val;
       oscPort.send({
         address: "/s2/scena",
         args: [{type: "f",value: scenario2}]
       });
     }
   });
 }, 1000);
/* end code osc conn */


//////////////
// ORION API
//////////////
client.registerMethod("orionVersion", orionBaseURL+"/version", "GET");
client.registerMethod("queryContext", orionBaseURL+"/v1/queryContext", "POST");
client.registerMethod("updateContext", orionBaseURL+"/v1/updateContext", "POST");

// Generic API callback Orion GET queries translator
var translateGETQueryToOrion = function(scenario,sensortype,pintype,pin,callback){
  callback = callback || function(){};
  var queryObject = { headers: { "Content-Type": "application/json" }, data: {} };

  queryObject.data = {  entities : [ { "type": "Scenario", "isPattern": "false", "id": scenario } ], attributes : [ sensortype+pintype+pin ] };

  client.methods.queryContext(queryObject, function (data, response) {
    // console.log("Get scenario: " + scenario +
    // ", sensortype: " + sensortype +
    // ", pintype: " + pintype +
    // ", pin: " + pin );
    callback(data);
  });
};

var translatePOSTQueryToOrion = function(scenario,sensortype,pintype,pin,value, callback){
  callback = callback || function(){};
  var queryObject = {
    data: {},
    headers: { "Content-Type": "application/json" }
  };
  queryObject.data =  {"contextElements":[
                          { "type": "Scenario",
                            "isPattern": "false",
                            "id": scenario,
                            "attributes": [
                              {
                                "name": sensortype+pintype+pin,
                                "type": "float",
                                "value": value
                              }
                            ]
                          }
                        ],
                        "updateAction": "UPDATE"
                      };

  client.methods.updateContext(queryObject, function (data, response) {
    // console.log("POST scenario: " + scenario +
    // ", sensortype: " + sensortype +
    // ", pintype: " + pintype +
    // ", pin: " + pin +
    // ", value: " + value );
    callback(data);
  });
};
