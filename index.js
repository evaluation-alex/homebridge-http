var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

	module.exports = function(homebridge){
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		homebridge.registerAccessory("homebridge-http", "Http", HttpAccessory);
	}

	function updateStatus (thisUpdate,state)
	{

		switch (thisUpdate.service)
		{
				case "Button":
					thisUpdate.polling = 1;
					thisUpdate.buttonService.getCharacteristic(Characteristic.On)
					.setValue(state);
					break;
				case "Light":
					thisUpdate.First = 0;
					thisUpdate.lightbulbService.getCharacteristic(Characteristic.On)
					.setValue(state);
					break;
		}
	}


	function HttpAccessory(log, config)
	{
		this.log = log;

		// url info
		this.on_url                 = config["on_url"];
		this.on_body                = config["on_body"];
		this.off_url                = config["off_url"];
		this.off_body               = config["off_body"];
		this.status_url             = config["status_url"];
		this.brightness_url         = config["brightness_url"];
		this.brightnesslvl_url      = config["brightnesslvl_url"];
		this.http_method            = config["http_method"] 	  	 	|| "GET";;
		this.http_brightness_method = config["http_brightness_method"]  || this.http_method;
		this.username               = config["username"] 	  	 	 	|| "";
		this.password               = config["password"] 	  	 	 	|| "";
		this.sendimmediately        = config["sendimmediately"] 	 	|| "";
		this.service                = config["service"] 	  	 	 	|| "Switch";
		this.name                   = config["name"];
		this.brightnessHandling     = config["brightnessHandling"] 	 	|| "yes";
		this.switchHandling 				= config["switchHandling"] 		 	|| "yes";
		this.volInt                 = config["volInt"];

		this.urlCoolingState        = config["coolingState"];
		this.urlSetHeatingCoolingState= config["SetHeatingCoolingState"];
		this.urlCurrentTemperature 	= config["CurrentTemperature"];
		this.urlTargetTemperature   = config["TargetTemperature"];
		this.urlIdHeat							= config["IdHeat"];
		this.urlIdCool   						= config["IdCool"];


		//realtime polling info
		this.state = false;
		this.currentlevel = 0;
		this.polling = 0;
		this.pollinglvl = 0;
		this.first = 1;
		this.isRGBW = true;


		var that = this;

		// Status Polling, if you want to add additional services that don't use switch handling you can add something like this || (this.service=="Smoke" || this.service=="Motion"))
		if (this.status_url && this.switchHandling =="realtime" && this.brightnessHandling !="realtime")
		{
			var powerurl = this.status_url;
			var statusemitter = pollingtoevent(function(done) {
	        	that.httpRequest(powerurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
            		if (error) {
                		that.log('HTTP get power function failed: %s', error.message);
		                //callback(error);
            		} else
								{
									if (parseInt(body) > 0)
									{
										done(null, 1);
									} else
									{
										done(null, 0);
									}
            		}
        		})
			}, {longpolling:true,interval:1000,longpollEventName:"statuspoll"});

		statusemitter.on("statuspoll", function(data)
		{
			//that.log("DATA : ",data);
      //var binaryState = parseInt(data);
	    //that.state = binaryState > 0;
			that.state = data;
			that.polling = 1;
			//that.log(that.service, "received power",that.status_url, "state is currently", binaryState);
			// switch used to easily add additonal services
			switch (that.service)
			{
					case "Switch":
						if (that.switchService ) {
							that.switchService .getCharacteristic(Characteristic.On)
							.setValue(that.state);
						}
						break;
					case "Light":
						if (that.lightbulbService)
						{
							//that.state = -1;
							that.lightbulbService.getCharacteristic(Characteristic.On)
							.setValue(that.state);
						}
						break;
					case "Smoke":
						if (that.smokeService) {
							that.smokeService.getCharacteristic(Characteristic.SmokeDetected)
							.setValue(that.state);
						}
						break;
					case "Motion":
						if (that.motionService) {
							that.motionService.getCharacteristic(Characteristic.MotionDetected)
							.setValue(that.state);
						}
						break;
					case "Door":
							if (that.doorService) {
								that.doorService.getCharacteristic(Characteristic.PositionState)
								.setValue(that.state);
							}
							break;
					case "Contact":
							if (that.сontactService) {
								that.сontactService.getCharacteristic(Characteristic.ContactSensorState)
								.setValue(that.state);
							}
							break;
					case "ProgButton1":
							if (that.programmableButtonService1) {
								that.programmableButtonService1.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
								.setValue(that.state);
							}
							break;
					case "ProgButton2":
							if (that.programmableButtonService2) {
								that.programmableButtonService2.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
								.setValue(that.state);
							}
							break;
					case "Leak":
							if (that.leakService) {
								that.leakService.getCharacteristic(Characteristic.LeakDetected)
								.setValue(that.state);
							}
							break;

				}
		});

	}

	// Brightness Polling
	if (this.brightnesslvl_url && this.brightnessHandling =="realtime" && (this.service=="Light" || this.service=="SecuritySystem" ) )
	{
		var brightnessurl = this.brightnesslvl_url;
		var levelemitter = pollingtoevent(function(done) {
	        	that.httpRequest(brightnessurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
            		if (error) {
                			that.log('HTTP get power function failed: %s', error.message);
							return;
            		} else {
						done(null, responseBody);
            		}
        		}) // set longer polling as slider takes longer to set value
    	}, {longpolling:true,interval:2000,longpollEventName:"levelpoll"});

		levelemitter.on("levelpoll", function(data)
		{
			that.currentlevel = parseInt(data);
			that.state = data > 0;
			that.pollinglvl = 1;
			that.polling = 1;

			if (that.volInt)
			{
				that.currentlevel = parseInt(that.currentlevel / that.volInt);
			}



			switch (that.service)
			{
					case "Light":
						if (that.lightbulbService)
						{
							//that.log(that.service, "received brightness",that.brightnesslvl_url, "level is currently", that.currentlevel);

							that.lightbulbService.getCharacteristic(Characteristic.On)
							.setValue(that.state);

							that.lightbulbService.getCharacteristic(Characteristic.Brightness)
							.setValue(that.currentlevel);
						}

						break;

					case "SecuritySystem":
						if (that.securitySystemService)
						{
							//that.log(that.service, "received brightness",that.brightnesslvl_url, "level is currently", that.currentlevel);
							that.log(that.currentlevel);
							that.securitySystemService.getCharacteristic(Characteristic.SecuritySystemCurrentState)
							.setValue(that.currentlevel - 1);

							//that.securitySystemService.getCharacteristic(Characteristic.SecuritySystemTargetState)
							//.setValue(that.currentlevel - 1);

							//that.SecuritySystem.getCharacteristic(Characteristic.Brightness)
							//.setValue(that.SecuritySystem);
						}
						break;

		}
		});
	}


	// Status
	if (this.service=="TemperatureSensor" || this.service=="HumiditySensor" || this.service=="LightSensor")
	{
		var brightnessurl = this.brightnesslvl_url;
		var sensormitter = pollingtoevent(function(done) {
						that.httpRequest(brightnessurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
								if (error) {
											that.log('HTTP get power function failed: %s', error.message);
							return;
								} else {
						done(null, responseBody);
								}
						}) // set longer polling as slider takes longer to set value
			}, {longpolling:true,interval:60000,longpollEventName:"levelpoll"});

	sensormitter.on("levelpoll", function(data)
	{
		//that.log("DATA : ",data);
		//var binaryState = parseInt(data);
		//that.state = binaryState > 0;
		that.currentlevel = parseInt(data);
		that.pollinglvl = 1;

		if (that.service=="LightSensor" && that.currentlevel == 0)
		{
			that.currentlevel = 1;
		}
		//that.log(that.service, "received power",that.status_url, "state is currently", binaryState);
		// switch used to easily add additonal services

		switch (that.service)
		{
				case "TemperatureSensor":
					if (that.temperatureService) {
						that.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
						.setValue(that.currentlevel);
					}
					break;
				case "HumiditySensor":
					if (that.humidityService) {
						that.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
						.setValue(that.currentlevel);
					}
					break;
				case "LightSensor":
					if (that.lightService) {
						that.lightService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
						.setValue(that.currentlevel);
					}
					break;
			}
	});

	}


}




	HttpAccessory.prototype = {

	httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false,
			auth: {
				user: username,
				pass: password,
				sendImmediately: sendimmediately
			}
		},
		function(error, response, body) {
			callback(error, response, body)
		})
	},



	setButton: function(powerOn, callback)
	{
		var url;
		var body;

		if (!this.on_url) {
				this.log.warn("Ignoring request; No power url defined.");
				callback(new Error("No power url defined."));
				return;
		}

		if (this.polling == 1)
		{
			this.polling = 0;
			this.log("pool");
			callback();
		}else {





				url = this.on_url;
				body = this.on_body;
				this.log("Setting power state to on");


			this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error) {
				this.log('HTTP set power function failed: %s', error.message);
				callback(error);
				} else {
				this.log('HTTP set power function succeeded!');

				callback();

				setTimeout(updateStatus, 3000, this ,0);

				}
			}.bind(this));

		}

	},


setPowerStateTest: function(powerOn, callback)
{



	if (this.polling == 1)
	{
		this.polling = 0;
		this.state = powerOn;
		this.log("polling = setPowerState");
	}
	else if (this.service == "Light" && this.First == 1)
	{
		setTimeout(updateStatus, 2, this ,powerOn);
	}
	else
	{

		var siri;
		var Brightness = 0;
		var On = 0;

		this.First = 1;

		if (this.service != "Switch")
		{

			if (this.lightbulbService)
			{
				var Brightness = this.lightbulbService.getCharacteristic(Characteristic.Brightness).value || 0;
				var On = this.lightbulbService.getCharacteristic(Characteristic.On).value || 0;
			}else if(this.lightRGBService)
			{
				var Brightness = this.lightRGBService.getCharacteristic(Characteristic.Brightness).value || 0;
				var On = this.lightRGBService.getCharacteristic(Characteristic.On).value || 0;
			}
		}

		this.log("//////////////////////////////////////");
		this.log("setPowerStateTest");
		this.log(On);
		this.log(Brightness);


		if (powerOn === 1 || powerOn === 0)
		{
			this.log("App");
			this.log(powerOn);
			this.log(callback);
			siri = 0;
		}
		else
		{
			this.log("SiRi");
			this.log(powerOn);
			this.log(callback);
			siri = 1;
		}

		this.log("//////////////////////////////////////");

		if( (Brightness > 0) != powerOn || this.service == "Switch")
		{


			this.log("Set setPowerState");

			if (powerOn) {
				url = this.on_url;
				body = this.on_body;
				this.log("Setting power state to on");
			} else {
				url = this.off_url;
				body = this.off_body;
				this.log("Setting power state to off");
			}

			this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error)
				{
					this.log('HTTP set power function failed: %s', error.message);
					callback(error);
				}else{

					if (this.brightness_url)
					{


						if (this.service != "Switch")
						{
							if (this.lightbulbService)
							{
								this.pollinglvl = 1;
								this.lightbulbService.getCharacteristic(Characteristic.Brightness)
								.setValue(powerOn?100:0);
							}else if(this.lightRGBService)
							{
								this.pollinglvl = 1;
								this.lightRGBService.getCharacteristic(Characteristic.Brightness)
								.setValue(powerOn?100:0);
							}
						}else if (powerOn&&siri)
						{
							//this.lightbulbService.getCharacteristic(Characteristic.Brightness)
							//.setValue(100);
						}
						this.log('HTTP set power function succeeded!');
					}
				}
			}.bind(this));
			}
	}
		//this.lightbulbService.getCharacteristic(Characteristic.Brightness).value = powerOn;
		callback();
},

setBrightnessTest: function(level, callback)
{

	if (this.pollinglvl == 1)
	{
		this.pollinglvl = 0;
		this.currentlevel = level;
		this.log("polling = setBrightnessTest");

	} else
	{
		var Brightness = this.lightbulbService.getCharacteristic(Characteristic.Brightness).value || 0;
		var On = this.lightbulbService.getCharacteristic(Characteristic.On).value || 0;

		this.log("//////////////////////////////////////");
		this.log("setBrightnessTest");
		this.log(On);
		this.log(Brightness);
		this.log(level);
		this.log(callback);
		this.log("//////////////////////////////////////");

		if ( Brightness != level )
			{



				if (this.volInt)
				{
					level= parseInt(level * this.volInt);
				}

				var url = this.brightness_url.replace("%b", level)

				this.log("Setting brightness to %s", level);

				this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
				if (error) {
					this.log('HTTP brightness function failed: %s', error);
					callback(error);
				}
				}.bind(this));

			}
	}

	callback();

},




	setPowerState: function(powerOn, callback)
	{

		var url;
		var body;
		var siri;

			if (this.polling == 1)
			{
				this.log("polling = setPowerState");

				this.polling = 0;
				this.state = powerOn;

				callback();
			}else if (!this.on_url || !this.off_url) {
					this.log.warn("Ignoring request; No power url defined.");
					callback(new Error("No power url defined."));
					return;
			}

			else
			{

				if (powerOn === 1 || powerOn === 0)
				{
					this.log("setPowerState App");
					this.log(powerOn);
					this.log(callback);
					siri = 0;
				}
				else
				{
					this.log("setPowerState SiRi");
					this.log(powerOn);
					this.log(callback);
					siri = 1;
				}

				if(this.currentlevel >0 != powerOn  || this.service != "Light")
				{

					this.polling = 0;

					if (this.state == 0)
					{
						this.pollinglvl = 0;
					}else
					{
						this.pollinglvl = 1;
					}


					this.state = powerOn;

					this.log("Set setPowerState");

					if (powerOn) {
						url = this.on_url;
						body = this.on_body;
						this.log("Setting power state to on");
					} else {
						url = this.off_url;
						body = this.off_body;
						this.log("Setting power state to off");
					}

					this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
						if (error)
						{
							this.log('HTTP set power function failed: %s', error.message);
							callback(error);
						} else
						{

							if (this.brightness_url)
							{
								if (powerOn == 0)
								{
									if (this.lightbulbService)
									{
										this.lightbulbService.getCharacteristic(Characteristic.Brightness)
										.setValue(0);
									}else if(this.lightRGBService)
									{
										this.lightRGBService.getCharacteristic(Characteristic.Brightness)
										.setValue(0);
									}
								}else if (powerOn&&siri)
								{
									//this.lightbulbService.getCharacteristic(Characteristic.Brightness)
									//.setValue(100);
								}
								this.log('HTTP set power function succeeded!');
							}

							callback();
						}
					}.bind(this));
					}
					else
					{
						this.polling = 0;
						callback();
					}
				}
},

setBrightness: function(level, callback)
{

		if (this.pollinglvl == 1 || this.currentlevel == level)
		{
			//this.log("_____________");
			this.log("pollinglvl = setBrightness");
			///this.log("-------------");

			this.pollinglvl = 0;
			//this.currentlevel = level;
			this.currentlevel = level;
			callback();
		} else if (!this.brightness_url)
		{
			this.log.warn("Ignoring request; No brightness url defined.");
			callback(new Error("No brightness url defined."));
			return;
		}else
		{

			this.currentlevel = level;
			this.pollinglvl = 0;
			this.polling = 1;
			//this.log("_____________");
			this.log("Set setBrightness");
			//this.log("-------------");

			if (this.volInt)
			{
				level= parseInt(level * this.volInt);
			}

			var url = this.brightness_url.replace("%b", level)

			this.log("Setting brightness to %s", level);

			this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
			if (error) {
				this.log('HTTP brightness function failed: %s', error);
				callback(error);
			} else {
				this.log('HTTP brightness function succeeded!');

				if (this.lightbulbService)
				{
					this.lightbulbService.getCharacteristic(Characteristic.On)
					.setValue(level>0);
				}else if(this.lightRGBService)
				{
					this.lightRGBService.getCharacteristic(Characteristic.On)
					.setValue(level>0);
				}

				callback(null,parseInt(level));
			}
			}.bind(this));

		}

		//this.log("setBrightness");
		//this.log(level);
		//this.log(callback);

		//callback();

},




hsv2rgbw: function(obj){
// This section is modified by the addition of white so that it assumes
// fully saturated colors, and then scales with white to lower saturation.
//
// Next, scale appropriately the pure color by mixing with the white channel.
// Saturation is defined as "the ratio of colorfulness to brightness" so we will
// do this by a simple ratio wherein the color values are scaled down by (1-S)
// while the white LED is placed at S.

// This will maintain constant brightness because in HSI, R+B+G = I. Thus,
// S*(R+B+G) = S*I. If we add to this (1-S)*I, where I is the total intensity,
// the sum intensity stays constant while the ratio of colorfulness to brightness
// goes down by S linearly relative to total Intensity, which is constant.
  //debug("Transforming: ", obj);
  var r, g, b, w, h = obj.h, s = obj.s / 100, v = obj.v / 100, cos_h, cos_1047_h, rgbw = Array();
  h = h % 360; // cycle h around to 0-360 degrees
  h = 3.14159*h/180; // Convert to radians.
  s = s>0?(s<1?s:1):0; // clamp s and v to interval [0,1]
  v = v>0?(v<1?v:1):0;

  if(h < 2.09439) {
    cos_h = Math.cos(h);
    cos_1047_h = Math.cos(1.047196667-h);
    r = s*255*v/3*(1+cos_h/cos_1047_h);
    g = s*255*v/3*(1+(1-cos_h/cos_1047_h));
    b = 0;
    w = 255*(1-s)*v;
  } else if(h < 4.188787) {
    h = h - 2.09439;
    cos_h = Math.cos(h);
    cos_1047_h = Math.cos(1.047196667-h);
    g = s*255*v/3*(1+cos_h/cos_1047_h);
    b = s*255*v/3*(1+(1-cos_h/cos_1047_h));
    r = 0;
    w = 255*(1-s)*v;
  } else {
    h = h - 4.188787;
    cos_h = Math.cos(h);
    cos_1047_h = Math.cos(1.047196667-h);
    b = s*255*v/3*(1+cos_h/cos_1047_h);
    r = s*255*v/3*(1+(1-cos_h/cos_1047_h));
    g = 0;
    w = 255*(1-s)*v;
  }


  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    w: Math.round(w)
  };
},
rgb2hsv: function(obj) {
  // RGB: 0-255; H: 0-360, S,V: 0-100
  //debug("rgb2hsv: R: %s G: %s B: %s", obj.r, obj.g, obj.b);
  var r = obj.r/255, g = obj.g/255, b = obj.b/255;
  var max, min, d, h, s, v;

  min = Math.min(r, Math.min(g, b));
  max = Math.max(r, Math.max(g, b));

  if (min === max) {
      // shade of gray
      return {h: 0, s: 0, v: r * 100};
  }

  var d = (r === min) ? g - b : ((b === min) ? r - g : b - r);
  h = (r === min) ? 3 : ((b === min) ? 1 : 5);
  h = 60 * (h - d/(max - min));
  s = (max - min) / max;
  v = max;
  return {"h": h, "s": s * 100, "v": v * 100};
},

hsv2rgb: function(obj) {
  // H: 0-360; S,V: 0-100; RGB: 0-255
  //debug("hsv2rgb: h: %s s: %s v: %s", obj.h, obj.s, obj.v);
  var r, g, b;
  var sfrac = obj.s / 100;
  var vfrac = obj.v / 100;

  if(sfrac === 0){
      var vbyte = Math.round(vfrac*255);
      return { r: vbyte, g: vbyte, b: vbyte };
  }

  var hdb60 = (obj.h % 360) / 60;
  var sector = Math.floor(hdb60);
  var fpart = hdb60 - sector;
  var c = vfrac * (1 - sfrac);
  var x1 = vfrac * (1 - sfrac * fpart);
  var x2 = vfrac * (1 - sfrac * (1 - fpart));
  switch(sector){
      case 0:
          r = vfrac; g = x2;    b = c;      break;
      case 1:
          r = x1;    g = vfrac; b = c;      break;
      case 2:
          r = c;     g = vfrac; b = x2;     break;
      case 3:
          r = c;     g = x1;    b = vfrac;  break;
      case 4:
          r = x2;    g = c;     b = vfrac;  break;
      case 5:
      default:
          r = vfrac; g = c;     b = x1;     break;
  }

  return {
    r: Math.round(255 * r),
    g: Math.round(255 * g),
    b: Math.round(255 * b)
  };
},

fromHSV: function(hue,saturation,brightness)
{
  if(this.isRGBW){
    return this.hsv2rgbw({h: hue, s: saturation, v: brightness});
  }else{
    return this.hsv2rgb({h: hue, s: saturation, v: brightness});
  }
},

setBrightnessRGB: function(level, callback)
{

	var saturation = this.lightRGBService.getCharacteristic(Characteristic.Saturation).value || 0;
	var hue = this.lightRGBService.getCharacteristic(Characteristic.Hue).value || 0;
	color = this.fromHSV(hue,saturation,level);
	//return this.setColor(color);



  RBDlvl = JSON.stringify(color).replace(/"|:|{|}/g,'').toUpperCase();

		this.currentlevel = level;

		//this.log("_____________");
		this.log("Set setRGBBrightness");
		//this.log("-------------");


		var url = this.brightness_url.replace("%b", RBDlvl)

		this.log("Setting brightness to %s", RBDlvl);

		this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
		if (error) {
			this.log('HTTP brightness function failed: %s', error);
			callback(error);
		} else {
			this.log('HTTP brightness function succeeded!');



			callback(null,level);
		}
		}.bind(this));



},


getBrightnessRGB: function(callback)
{

	if (!this.brightnesslvl_url) {
		this.log.warn("Ignoring request; No brightness level url defined.");
		callback(new Error("No brightness level url defined."));
		return;
	}
		var url = this.brightnesslvl_url;
		this.log("Getting Brightness level");

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
		if (error) {
			this.log('HTTP get brightness function failed: %s', error.message);
			callback(error);
		} else {

			var map = ['W','D','R','G','B']
			var body = responseBody.trim();
			color = {}
			body.split(",").forEach(function(value){
				channel = map[value.match(/^(\d)=/)[1]].toLowerCase()
				value = parseInt(value.match(/=(\d+)/)[1])
				color[channel] = value;
			});

			callback(null, this.toHSV(color).v);
		}
		}.bind(this));






},

setHue: function(level, callback)
{

	var saturation = this.lightRGBService.getCharacteristic(Characteristic.Saturation).value;
	var brightness = this.lightRGBService.getCharacteristic(Characteristic.Brightness).value;
	if(isNaN(saturation)){
		//RgbLight.setHue(value, service);
		callback(null,level);
	}else{
		color = this.fromHSV(level,saturation,brightness);
		RBDlvl = JSON.stringify(color).replace(/"|:|{|}/g,'').toUpperCase();

			this.currentlevel = level;

			//this.log("_____________");
			this.log("Set setRGBBrightness");
			//this.log("-------------");


			var url = this.brightness_url.replace("%b", RBDlvl)

			this.log("Setting brightness to %s", RBDlvl);

			this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
			if (error) {
				this.log('HTTP brightness function failed: %s', error);
				callback(error);
			} else {
				this.log('HTTP brightness function succeeded!');



				callback(null,level);
			}
			}.bind(this));

	}
},

getHue: function(callback)
{
		callback(null,1);
},


setSaturation: function(level, callback)
{

				callback(null,parseInt(level));
},

getSaturation: function(callback)
{
		callback(null,1);
},


//////////////////////////////////////
getTest1: function(callback)
{
	this.log("getTest1");
	//this.log(this.state);
	callback(null, 1);
},

setTest1: function(powerOn, callback)
{
	this.log("setTest1");
	this.log(powerOn);
	callback(null, parseInt(powerOn));
},

getTest2: function(callback)
{
	this.log("getTest2");
	//this.log(this.state);
	callback(null, 3);
},

setTest2: function(powerOn, callback)
{
	this.log("setTest2");
	this.log(powerOn);
	callback(null, parseInt(powerOn));
},


getRealTimePowerState: function(callback)
{
	this.log("Getting getRealTime");
	this.log(this.state);
	callback(null, this.state);
},

getRealTimeBrightness: function(callback)
{
	this.log("Getting getRealTime");
	this.log(this.currentlevel);
	callback(null, parseInt(this.currentlevel));
},





  getPowerState: function(callback) {
	if (!this.status_url) {
		this.log.warn("Ignoring request; No status url defined.");
		callback(new Error("No status url defined."));
		return;
	}

	var url = this.status_url;
	this.log("Getting power state");

	this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	if (error) {
		this.log('HTTP get power function failed: %s', error.message);
		callback(error);
	} else {
		var binaryState = parseInt(responseBody);
		var powerOn = binaryState > 0;
		this.log("Power state is currently %s", binaryState);
		callback(null, powerOn);
	}
	}.bind(this));
  },



	getBrightness: function(callback) {
		if (!this.brightnesslvl_url) {
			this.log.warn("Ignoring request; No brightness level url defined.");
			callback(new Error("No brightness level url defined."));
			return;
		}
			var url = this.brightnesslvl_url;
			this.log("Getting Brightness level");

			this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP get brightness function failed: %s', error.message);
				callback(error);
			} else {
				var binaryState = parseInt(responseBody);
				var level = binaryState;
				this.log("brightness state is currently %s", binaryState);

				if (this.volInt)
				{
					level= parseInt(level / this.volInt);
				}

				callback(null, parseInt(level));
			}
			}.bind(this));
	  },
/////////////////////////////////////////////////////////////////

		getSecuritySystem: function(callback) {
			if (!this.brightnesslvl_url) {
				this.log.warn("Ignoring request; No brightness level url defined.");
				callback(new Error("No brightness level url defined."));
				return;
			}
				var url = this.brightnesslvl_url;
				this.log("Getting Brightness level");

				this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error) {
					this.log('HTTP get brightness function failed: %s', error.message);
					callback(error);
				} else {
					var binaryState = parseInt(responseBody);
					var level = binaryState;
					this.log("brightness state is currently %s", parseInt(level) - 1);
					callback(null, parseInt(level) - 1);
				}
				}.bind(this));
			},

		setSecuritySystem: function(level, callback)
			{

					if (!this.brightness_url)
					{
						this.log.warn("Ignoring request; No brightness url defined.");
						callback(new Error("No brightness url defined."));
						return;
					}

						this.currentlevel = level - 1;

						//this.log("_____________");
						this.log("Set setBrightness");
						//this.log("-------------");


						var url = this.brightness_url.replace("%b", level + 1)

						this.log("Setting brightness to %s", level + 1);

						this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
						if (error) {
							this.log('HTTP brightness function failed: %s', error);
							callback(error);
						} else {
							this.log('HTTP brightness function succeeded!');
							callback(null,parseInt(level) + 1);
						}
						}.bind(this));



					//this.log("setBrightness");
					//this.log(level);
					//this.log(callback);

					//callback();

			},



setTargetHeatingCoolingState: function(value, callback)
{
	var vera_value;

	switch(value)
	{
				case Characteristic.TargetHeatingCoolingState.OFF:
						vera_value = "Off";
						break;
				case Characteristic.TargetHeatingCoolingState.HEAT:
						vera_value = "HeatOn";
						break;
				case Characteristic.TargetHeatingCoolingState.COOL:
						vera_value = "CoolOn";
						break;
				case Characteristic.TargetHeatingCoolingState.AUTO:
						vera_value = "AutoChangeOver";
						break;
		}


		var url = this.urlSetHeatingCoolingState.replace("%b", vera_value)


		this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
		if (error) {
			this.log('HTTP brightness function failed: %s', error);
			callback(error);
		} else {
			callback(null,value);
		}
		}.bind(this));

},

setTargetTemperature: function(value, callback)
{

		var url = this.urlIdHeat.replace("%b", value)

		this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
		if (error) {
			this.log('HTTP brightness function failed: %s', error);
			callback(error);
		}
		}.bind(this));

		var url = this.urlIdCool.replace("%b", value)

		this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
		if (error) {
			this.log('HTTP brightness function failed: %s', error);
			callback(error);
		}
		}.bind(this));


		callback(null,value);

},




getCurrentHeatingCoolingState: function(callback) {

		var url = this.urlCoolingState;

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
		if (error) {
			this.log('HTTP get brightness function failed: %s', error.message);
			callback(error);
		} else
		{
			var vera_state = response.body;
      var state;
      switch(vera_state)
			{
          case "Off":
          case "InDeadBand":
              state = Characteristic.CurrentHeatingCoolingState.OFF;
              break;
          case "HeatOn":
          case "AuxHeatOn":
          case "EconomyHeatOn":
          case "EmergencyHeatOn":
          case "EnergySavingsHeating":
          case "BuildingProtection":
              state = Characteristic.CurrentHeatingCoolingState.HEAT;
              break;
          case "CoolOn":
          case "AuxCoolOn":
          case "EconomyCoolOn":
              state = Characteristic.CurrentHeatingCoolingState.COOL;
              break;
          default:
              null;
      }
			callback(null, state);
		}
		}.bind(this));
	},

getTargetHeatingCoolingState: function(callback)
{
	var url = this.urlCoolingState;

	this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	if (error) {
		this.log('HTTP get brightness function failed: %s', error.message);
		callback(error);
	} else
	{
		var vera_state = response.body;
    var state;
    switch(vera_state){
        case "Off":
            state = Characteristic.TargetHeatingCoolingState.OFF;
            break;
        case "HeatOn":
        case "AuxHeatOn":
        case "EconomyHeatOn":
        case "EmergencyHeatOn":
        case "BuildingProtection":
            state = Characteristic.TargetHeatingCoolingState.HEAT;
            break;
        case "CoolOn":
        case "AuxCoolOn":
        case "EconomyCoolOn":
            state = Characteristic.TargetHeatingCoolingState.COOL;
            break;
        case "AutoChangeOver":
        case "EnergySavingsMode":
            state = Characteristic.TargetHeatingCoolingState.AUTO;
            break;
        default:
            null;
    }

		callback(null, state);
	}
	}.bind(this));
},

getCurrentTemperature: function(callback)
{
	var url = this.urlCurrentTemperature;

	this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	if (error) {
		this.log('HTTP get brightness function failed: %s', error.message);
		callback(error);
	} else
	{
		data = parseFloat(response.body.toString('utf8'));
		callback(null, data);
	}
	}.bind(this));
},

getTargetTemperature: function(callback)
{
	var url = this.urlTargetTemperature;

	this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	if (error) {
		this.log('HTTP get brightness function failed: %s', error.message);
		callback(error);
	} else
	{
		data = parseFloat(response.body.toString('utf8'));
		callback(null, data);
	}
	}.bind(this));
},



/*
this.urlCoolingState        = config["coolingState"];
this.urlSetHeatingCoolingState= config["SetHeatingCoolingState"];
this.urlCurrentTemperature 	= config["CurrentTemperature"];
this.urlTargetTemperature   = config["TargetTemperature"];
this.urlIdHeat							= config["IdHeat"];
this.urlIdCool   						= config["IdCool"];
*/

	identify: function(callback)
	{
		this.log("Identify requested!");
		callback(); // success
	},

	getServices: function()
	{

		//var that = this;

		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
		.setCharacteristic(Characteristic.Manufacturer, "HTTP Manufacturer")
		.setCharacteristic(Characteristic.Model, "HTTP Model")
		.setCharacteristic(Characteristic.SerialNumber, "HTTP Serial Number");

		switch (this.service)
		{
			case "Switch":
				this.switchService = new Service.Switch(this.name);
				switch (this.switchHandling) {
					//Power Polling
					case "yes":
						this.switchService
						.getCharacteristic(Characteristic.On)
						.on('get', this.getPowerState.bind(this))
						.on('set', this.setPowerStateTest.bind(this));
						break;
					case "realtime":
						this.switchService
						.getCharacteristic(Characteristic.On)
						.on('get', this.getRealTimePowerState.bind(this))
						.on('set', this.setPowerStateTest.bind(this));
						break;
					default	:
						this.switchService
						.getCharacteristic(Characteristic.On)
						.on('set', this.setPowerStateTest.bind(this));
						break;}
						return [this.switchService];
						break;
			case "Light":
				this.lightbulbService = new Service.Lightbulb(this.name);
				switch (this.switchHandling) {
				//Power Polling
				case "yes" :
					this.lightbulbService
					.getCharacteristic(Characteristic.On)
					.on('get', this.getPowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));
					break;
				case "realtime":
					this.lightbulbService
					.getCharacteristic(Characteristic.On)
					.on('get', this.getRealTimePowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));
					break;
				default:
					this.lightbulbService
					.getCharacteristic(Characteristic.On)
					.on('set', this.setPowerStateTest.bind(this));
					break;
				}
				// Brightness Polling
				if (this.brightnessHandling == "realtime") {
					this.lightbulbService
					//.addCharacteristic(new Characteristic.Brightness())
					.getCharacteristic(Characteristic.Brightness)
					.on('get', this.getRealTimeBrightness.bind(this))
					.on('set', this.setBrightnessTest.bind(this));
				} else if (this.brightnessHandling == "yes") {
					this.lightbulbService
					//.addCharacteristic(new Characteristic.Brightness())
					.getCharacteristic(Characteristic.Brightness)
					.on('get', this.getBrightness.bind(this))
					.on('set', this.setBrightnessTest.bind(this));
				}

				return [informationService, this.lightbulbService];
				break;

			case "LightRGB":
				this.lightRGBService = new Service.Lightbulb(this.name);
				switch (this.switchHandling) {
				//Power Polling
				case "yes" :
					this.lightRGBService
					.getCharacteristic(Characteristic.On)
					.on('get', this.getPowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));
					break;
				case "realtime":
					this.lightRGBService
					.getCharacteristic(Characteristic.On)
					.on('get', this.getRealTimePowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));
					break;
				default:
					this.lightRGBService
					.getCharacteristic(Characteristic.On)
					.on('set', this.setPowerStateTest.bind(this));
					break;
				}
				// Brightness Polling
				if (this.brightnessHandling == "realtime") {

					this.lightRGBService
					.getCharacteristic(Characteristic.Brightness)
					//.addCharacteristic(new Characteristic.Brightness())
					.on('get', this.getRealTimeBrightness.bind(this))
					.on('set', this.setBrightnessRGB.bind(this));

					this.lightRGBService
					.getCharacteristic(Characteristic.Hue)
					//.addCharacteristic(new Characteristic.Brightness())
					.on('get', this.getHue.bind(this))
					.on('set', this.setHue.bind(this));

					this.lightRGBService
					.getCharacteristic(Characteristic.Saturation)
					//.addCharacteristic(new Characteristic.Brightness())
					.on('get', this.getSaturation.bind(this))
					.on('set', this.setSaturation.bind(this));


				} else if (this.brightnessHandling == "yes") {
					this.lightRGBService
					//.addCharacteristic(new Characteristic.Brightness())
					.getCharacteristic(Characteristic.Brightness)
					.on('get', this.getBrightness.bind(this))
					.on('set', this.setBrightnessTest.bind(this));



				}


				return [informationService, this.lightRGBService];
				break;


			case "Smoke":
				this.smokeService = new Service.SmokeSensor(this.name);

				this.smokeService
				.getCharacteristic(Characteristic.SmokeDetected)
				.on('get', this.getRealTimePowerState.bind(this))
				.on('set', this.setPowerStateTest.bind(this));

				return [this.smokeService];
				break;

			case "Motion":
				this.motionService = new Service.MotionSensor(this.name);

				this.motionService
				.getCharacteristic(Characteristic.MotionDetected)
				.on('get', this.getRealTimePowerState.bind(this))
				.on('set', this.setPowerStateTest.bind(this));

				return [this.motionService];
				break;

			case "Door":
					this.doorService = new Service.Door(this.name);

					this.doorService
					.getCharacteristic(Characteristic.PositionState)
					.on('get', this.getPowerState.bind(this));
					this.doorService
					.getCharacteristic(Characteristic.CurrentPosition)
					.on('get', this.getPowerState.bind(this));
					this.doorService
					.getCharacteristic(Characteristic.TargetPosition)
					.on('get', this.getPowerState.bind(this));

					return [this.doorService];
					break;

			case "Contact":
					this.сontactService = new Service.ContactSensor(this.name);

					this.сontactService
					.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', this.getRealTimePowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));

					return [this.сontactService];
					break;

			case "Leak":
					this.leakService = new Service.LeakSensor(this.name);

					this.leakService
					.getCharacteristic(Characteristic.LeakDetected)
					.on('get', this.getRealTimePowerState.bind(this))
					.on('set', this.setPowerStateTest.bind(this));

					return [this.leakService];
					break;


			case "TemperatureSensor":
				this.temperatureService = new Service.TemperatureSensor(this.name);

				this.temperatureService
				.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getRealTimeBrightness.bind(this))
				.on('set', this.setBrightnessTest.bind(this));

				return [this.temperatureService];
				break;
			case "HumiditySensor":
				this.humidityService = new Service.HumiditySensor(this.name);

				this.humidityService
				.getCharacteristic(Characteristic.CurrentRelativeHumidity)
				.on('get', this.getRealTimeBrightness.bind(this))
				.on('set', this.setBrightnessTest.bind(this));

				return [this.humidityService];
				break;
			case "LightSensor":
				this.lightService = new Service.LightSensor(this.name);

				this.lightService
				.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.on('get', this.getRealTimeBrightness.bind(this))
				.on('set', this.setBrightnessTest.bind(this));

				return [this.lightService];
				break;
			case "Button":
				this.buttonService = new Service.Switch(this.name);

				this.buttonService
				.getCharacteristic(Characteristic.On)
				.on('get', function(callback) {callback(null, 0)})
				.on('set', this.setButton.bind(this));


				return [this.buttonService];
				break;

			case "ProgButton1":

				this.programmableButtonService1 = new Service.StatefulProgrammableSwitch(this.name);

				this.programmableButtonService1
				.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
				.on('get', this.getRealTimePowerState.bind(this))
				.on('set', this.setTest2.bind(this));

				this.programmableButtonService1
				.getCharacteristic(Characteristic.ProgrammableSwitchOutputState)
				.on('get', this.getRealTimePowerState.bind(this))
				.on('set', this.setTest2.bind(this));



				return [this.programmableButtonService1];
				break;

			case "ProgButton2":

				this.programmableButtonService2 = new Service.StatelessProgrammableSwitch(this.name);

				this.programmableButtonService2
				.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
				.on('get', this.getRealTimePowerState.bind(this))
				.on('set', this.setTest1.bind(this));


				return [this.programmableButtonService2];
				break;


			case "SecuritySystem":
				this.securitySystemService = new Service.SecuritySystem(this.name);

				this.securitySystemService
				.getCharacteristic(Characteristic.SecuritySystemCurrentState)
				.on('get', this.getSecuritySystem.bind(this));
				//.on('set', this.setSecuritySystem.bind(this));

				this.securitySystemService
				.getCharacteristic(Characteristic.SecuritySystemTargetState)
				.on('get', this.getSecuritySystem.bind(this))
				.on('set', this.setSecuritySystem.bind(this));

				return [this.securitySystemService];
				break;

			case "Thermostat":
				this.thermostatService = new Service.Thermostat(this.name);

				this.thermostatService
				.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', this.getCurrentHeatingCoolingState.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', this.getTargetHeatingCoolingState.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('set', this.setTargetHeatingCoolingState.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getCurrentTemperature.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.TargetTemperature)
        .on('get', this.getTargetTemperature.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.TargetTemperature)
        .on('set', this.setTargetTemperature.bind(this));

        /*this.thermostatService
				.getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', this.getTemperatureDisplayUnits.bind(this));

        this.thermostatService
				.getCharacteristic(Characteristic.TemperatureDisplayUnits);
        //.on('set', this.getSecuritySystem.bind(this));*/

				return [this.thermostatService];
				break;

			/*case "Powermeter":
        this.primaryservice = new PowerMeterService(this.config.service);
        this.primaryservice.getCharacteristic(EvePowerConsumption)
            .on('get', this.getEvePowerConsumption.bind(this));
        break;*/
		}
	}
};
/*
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    ////////////////////////////// Custom characteristics //////////////////////////////
    EvePowerConsumption = function() {
        Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "watts",
            maxValue: 1000000000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EvePowerConsumption, Characteristic);

PowerMeterService = function(displayName, subtype) {
        Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
        // Required Characteristics
        this.addCharacteristic(EvePowerConsumption);
        // Optional Characteristics
        this.addOptionalCharacteristic(EveTotalPowerConsumption);
    };
    inherits(PowerMeterService, Service);*/
