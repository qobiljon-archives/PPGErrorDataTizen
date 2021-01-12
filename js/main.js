// variables
var ppgSensor, linearAccelerationSensor, lightSensor;
var listenerIdWalking, listenerIdRunning, listenerIdStationary;
var statusText;
var connectButton;
var appStatus = false;
var appVibrate = false;
var documentsDir;

// sensing (each data source separately)
function startHeartRateCollection() {
	appStatus = true;
	tizen.humanactivitymonitor.start('HRM', function(hrmInfo) {
		var timestamp = new Date().getTime();
		if (hrmInfo.heartRate > 0 && hrmInfo.rRInterval > 0) {
			appVibrate = false;
			saveRRIntervalSample(timestamp + ',' + hrmInfo.rRInterval);
			saveHeartRateSample(timestamp + ',' + hrmInfo.heartRate);
		} else if (hrmInfo.heartRate <= 0) {
			tizen.application.launch("WGvCVP8H7a.SAPTizenClient");
			/*if (!appVibrate) {
				appVibrate = true;
				navigator.vibrate(700);
			}*/
		}
	});
	console.log('HRM started');
}
function startSleepMonitoring() {
	var timestamp = new Date().getTime();
	tizen.humanactivitymonitor.start('SLEEP_MONITOR', function(sleepInfo) {
		saveSleepSample(timestamp + "," + sleepInfo.status);
		console.log("sleep status: " + sleepInfo.status)
	});
	console.log('sleep monitoring started');
}
function startGPS() {
	tizen.ppm.requestPermission("http://tizen.org/privilege/location", function() {
		var timestamp = new Date().getTime();
		var count = 1;
		var average = 0;
		tizen.humanactivitymonitor.start('GPS', function(info) {
			var gpsInfo = info.gpsInfo;
			var newTimestamp = new Date().getTime();
			var delta = newTimestamp - timestamp;
			average = ((count - 1) / count) * average + delta / count;
			timestamp = newTimestamp;
			for (var index = 0; index < gpsInfo.length; index++) {
				saveLocationSample(timestamp + "," + gpsInfo[index].latitude + "," + gpsInfo[index].longitude);
				statusText.innerHTML = "(" + count + ") " + delta + " ms<br>" + Math.round(average) + " ms";
			}
			count += 1;
		}, function(error) {
			console.log('Error occurred. Name:' + error.name + ', message: ' + error.message);
		}, {
			callbackInterval : 3000,
			sampleInterval : 1000
		});
		console.log('gps started');
	}, function(error) {
		console.log('failed to start GPS monitoring, permission error : ' + error.message);
	});
}
function startHRMRawCollection() {
	ppgSensor = tizen.sensorservice.getDefaultSensor("HRM_RAW");
	ppgSensor.start(function() {
		ppgSensor.getHRMRawSensorData(function(ppgData) {
			var timestamp = new Date().getTime();
			savePPGSample(timestamp + "," + ppgData.lightIntensity);
		}, function(error) {
			console.log("error occurred:" + error);
		});
		ppgSensor.setChangeListener(function(ppgData) {
			var timestamp = new Date().getTime();
			savePPGSample(timestamp + "," + ppgData.lightIntensity);
		}, 10);
	});
	console.log('HRM Raw collection started');
}
function startLinearAccelerationCollection() {
	linearAccelerationSensor = tizen.sensorservice.getDefaultSensor("LINEAR_ACCELERATION");
	linearAccelerationSensor.start(function() {
		linearAccelerationSensor.getLinearAccelerationSensorData(function(AccData) {
			var timestamp = new Date().getTime();
			saveAccelerometerSample(timestamp + "," + AccData.x + "," + AccData.y + "," + AccData.z);
		}, function(error) {
			console.log("error occurred:" + error);
		});
		linearAccelerationSensor.setChangeListener(function(AccData) {
			var timestamp = new Date().getTime();
			saveAccelerometerSample(timestamp + "," + AccData.x + "," + AccData.y + "," + AccData.z);
		}, 50);
	});
	console.log('Linear acc collection started');
}
function startAmbientLightCollection() {
	lightSensor = tizen.sensorservice.getDefaultSensor("LIGHT");
	lightSensor.start(function() {
		lightSensor.getLightSensorData(function(LightData) {
			var timestamp = new Date().getTime();
			saveAmbientLightSample(timestamp + "," + LightData.lightLevel);
			console.log("Ambient light level : " + LightData.lightLevel);
		}, function(error) {
			console.log("error occurred:" + error);
		});
		lightSensor.setChangeListener(function(LightData) {
			var timestamp = new Date().getTime();
			saveAmbientLightSample(timestamp + "," + LightData.lightLevel);
			// console.log("Ambient light level : "+ LightData.lightLevel );
		}, 10);
	});
	console.log('Ambient light sensor start');
}
function startActivityDetection() {
	listenerIdWalking = tizen.humanactivitymonitor.addActivityRecognitionListener('WALKING', function(activityInfo) {
		var timestamp = new Date().getTime();
		saveActivitySample(timestamp + "," + activityInfo.type);
		console.log("activity type: " + activityInfo.type);
	}, function(error) {
		console.log(error.name + ': ' + error.message);
	});
	listenerIdRunning = tizen.humanactivitymonitor.addActivityRecognitionListener('RUNNING', function(activityInfo) {
		var timestamp = new Date().getTime();
		saveActivitySample(timestamp + "," + activityInfo.type);
		console.log("activity type: " + activityInfo.type);
	}, function(error) {
		console.log(error.name + ': ' + error.message);
	});
	listenerIdStationary = tizen.humanactivitymonitor.addActivityRecognitionListener('STATIONARY', function(activityInfo) {
		var timestamp = new Date().getTime();
		saveActivitySample(timestamp + "," + activityInfo.type);
		console.log("activity type: " + activityInfo.type);
	}, function(error) {
		console.log(error.name + ': ' + error.message);
		console.log("activity type: " + activityInfo.type);
	});
}
// sensing overall
function startSensing() {
	if (connectButton.innerHTML == "Start"){
		startHeartRateCollection();
		// startSleepMonitoring();
		startGPS();
		startHRMRawCollection();
		startLinearAccelerationCollection();
		// startAmbientLightCollection();
		// startActivityDetection();
		
		connectButton.innerHTML = "Stop";
	} else {
		connectButton.innerHTML = "Start";
	}
}

// onstart
window.onload = function() {
	window.addEventListener('tizenhwkey', function(ev) {
		if (ev.keyName === "back") {
			var page = document.getElementsByClassName('ui-page-active')[0], pageid = page ? page.id : "";
			if (pageid === "main") {
				try {
					if (appStatus) {
						// window.webapis.motion.stop("HRM");
						tizen.application.getCurrentApplication().hide();
					} else {
						tizen.power.release("CPU");
						tizen.power.release("SCREEN");

						tizen.application.getCurrentApplication().exit();
					}
				} catch (ignore) {
				}
			} else {
				window.history.back();
			}
		}
	});

	// bind views
	statusText = document.getElementById("status_text");
	connectButton = document.getElementById("connect_button");
	setConnectionStatusHTML(false);

	// connect to the android agent
	connect();

	// hold the CPU lock
	tizen.power.request("CPU", "CPU_AWAKE");
	tizen.power.request("SCREEN", "SCREEN_NORMAL");

	// acquire permissions and start data collection
	tizen.ppm.requestPermission("http://tizen.org/privilege/mediastorage", function() {
		tizen.ppm.requestPermission("http://tizen.org/privilege/healthinfo", function() {
			tizen.filesystem.resolve("documents", function(dir) {
				documentsDir = dir;
				bindFilestreams();
				startSensing();
			}, function(error) {
				console.log('resolve error : ' + error.message);
			}, "rw");
		}, function(error) {
			console.log('resolve permission error : ' + error.message);
		});
	}, function(error) {
		console.log('resolve permission error : ' + error.message);
	});

	tizen.power.setScreenStateChangeListener(function(oldState, newState) {
		if (newState !== "SCREEN_BRIGHT" || !tizen.power.isScreenOn()) {
			tizen.power.turnScreenOn();
			tizen.power.setScreenBrightness(0.1);
		}
	});
};

// GUI
function aboutClick() {
	alert("It collects health and behavioral data for a stress sensing study. Have a nice day =)");
}
function setConnectionStatusHTML(status) {
	if (status) {
		statusText.style.color = '#2ecc71';
		statusText.innerHTML = 'BT : CONNECTED';
		connectButton.style.display = "none";
	} else {
		statusText.style.color = 'red';
		statusText.innerHTML = 'BT : DISCONNECTED';
		connectButton.style.display = "block";
	}
}
function exitApp() {
	tizen.application.getCurrentApplication().exit();
}