'use strict';

var recorder = {
    stopbutton_name: 'stopbutton',

    init: function () {
	this.recording = false;
        var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {
            var getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia);
            if (!getUserMedia) {
                return Promise.reject(
                    new Error('getUserMedia is not implemented in this browser')
                );
            }
            return new Promise(function(successCallback, errorCallback) {
                getUserMedia.call(navigator, constraints, successCallback,
                    errorCallback);
            });
        };
        if (navigator.mediaDevices === undefined) {
            navigator.mediaDevices = {};
        }
        if (navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
        }
	this.ac = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
    },

    start_recording: function(duration) {
        this.ac.resume();
	this.recBuffers = [];
	this.recLength = 0;
	this.sampleRate = this.ac.sampleRate;
	this.maxsample = duration* this.sampleRate;

        navigator.mediaDevices.getUserMedia({audio :true}).then(
            this.gotAudio.bind(this)
        ).catch(
            this.deviceError.bind(this)
        );
    },

    gotAudio: function(stream) {
        this.stream = stream;

        if (this.stream !== undefined) {
            this.microphone = this.ac.createMediaStreamSource(this.stream);

	    if (this.ac.createScriptProcessor) {
		this.node = this.ac.createScriptProcessor(4096,1,1);
            } else {
		this.node = this.ac.createJavaScriptNode(4096,1,1);
            }
            this.microphone.connect(this.node);
            this.node.connect(this.ac.destination);  // for Chrome
	    this.node.onaudioprocess = this.saveBuffer.bind(this);
        }
	this.recording = true;
	console.log('started recording');
    },

    saveBuffer: function(e) {
	var buf = new Float32Array(e.inputBuffer.length);
	e.inputBuffer.copyFromChannel(buf,0);
	this.recBuffers.push(buf); 
	this.recLength += e.inputBuffer.length;
	if (this.recLength > this.maxsample) {
	    document.getElementById(this.stopbutton_name).click();
	}
    },

    deviceError: function(code) {
	console.log(code);
    },

    stop_recording: function() {
	console.log('stop with '+ this.recLength + ' samples');
	this.recording = false;

        if (this.microphone !== undefined) {
            this.microphone.disconnect(this.node);
        }
        if (this.node !== undefined) {
            this.node.disconnect(this.ac.destination);
            this.node.onaudioprocess = undefined;
        }

	this.mergeBuffers(this.recBuffers);  // creates audio_buffer

        if (this.stream) {
            var result = this.detectBrowser();
            if ((result.browser === 'chrome' && result.version >= 45) ||
                (result.browser === 'firefox' && result.version >= 44) ||
                (result.browser === 'edge')) {
                if (this.stream.getTracks) { // note that this should not be a call
                    this.stream.getTracks().forEach(function (stream) {
                        stream.stop();
                    });
                    return;
                }
            }
            this.stream.stop();
        }
    },

    floatTo16BitPCM: function (view, offset, input){
	for (var i = 0; i < input.length; i++, offset+=2){
	    var s = Math.max(-1, Math.min(1, input[i]));
	    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
	}
    },

    writeString: function (view, offset, string){
	for (var i = 0; i < string.length; i++){
	    view.setUint8(offset + i, string.charCodeAt(i));
	}
    },

    encodeWAV: function (samples, mono){
	var buffer = new ArrayBuffer(44 + samples.length * 2);
	var view = new DataView(buffer);
	var numchannels = mono?1:2;
	
	this.writeString(view, 0, 'RIFF');   /* RIFF identifier */
	view.setUint32(4, 32 + samples.length * 2, true);   /* file length */
	this.writeString(view, 8, 'WAVE');   /* RIFF type */
	this.writeString(view, 12, 'fmt ');   /* format chunk identifier */
	view.setUint32(16, 16, true);   /* format chunk length */
	view.setUint16(20, 1, true);   /* sample format (raw) */
	view.setUint16(22, numchannels, true);   /* channel count */
	view.setUint32(24, this.sampleRate, true);   /* sample rate */
	view.setUint32(28, this.sampleRate * numchannels*2, true);   /* byte rate  */
	view.setUint16(32, numchannels*2, true);   /* block align  */
	view.setUint16(34, 16, true);   /* bits per sample */
	this.writeString(view, 36, 'data');   /* data chunk identifier */
	view.setUint32(40, samples.length * 2, true);   /* data chunk length */
	this.floatTo16BitPCM(view, 44, samples);

	return view;
    }, 

    mergeBuffers: function (){
	this.audio_buffer = new Float32Array(this.recLength);
	var offset = 0;
	for (var i = 0; i < this.recBuffers.length; i++){
	    this.audio_buffer.set(this.recBuffers[i], offset);
	    offset += this.recBuffers[i].length;
	}
    },

    decimate: function() {
	if (this.sampleRate > 44000) {
	    var newlength = Math.floor(this.recLength / 2);
	    var buf = new Float32Array(newlength);
	    var inputIndex = 0, i = 0;
	    for (i=0; i< newlength; i++) {
		buf[i] = (this.audio_buffer[inputIndex++] + this.audio_buffer[inputIndex++])/2;
	    }
	    this.recLength = newlength;
	    this.audio_buffer = new Float32Array(this.recLength);
	    this.audio_buffer.set(buf,0);
	    this.sampleRate /= 2;
	}
    },

    interleave: function (){
	var length = this.recLength*2;
	var result = new Float32Array(length);
	var index = 0, inputIndex = 0;

	while (index < length){
	    result[index++] = this.audio_buffer[inputIndex];
	    result[index++] = this.audio_buffer[inputIndex];
	    inputIndex++;
	}
	return result;
    },

    exportWAV: function (mono){
	var audioBlob;
	if (mono) {
	    var dataview = this.encodeWAV(this.audio_buffer,mono);
	} else {
	    var interleaved = this.interleave();
	    var dataview = this.encodeWAV(interleaved,mono);	
	}
	audioBlob = new Blob([dataview], { type: "audio/wav" });
	return audioBlob;
    },

    /**
     * Extract browser version out of the provided user agent string.
     * @param {!string} uastring userAgent string.
     * @param {!string} expr Regular expression used as match criteria.
     * @param {!number} pos position in the version string to be returned.
     * @return {!number} browser version.
     */
    extractVersion: function(uastring, expr, pos) {
        var match = uastring.match(expr);
	if (match && match.length >= pos) return parseInt(match[pos],10);
	else return;
    },

    /**
     * Browser detector.
     * @return {object} result containing browser, version and minVersion
     *     properties.
     */
    detectBrowser: function() {
        // Returned result object.
        var result = {};
        result.browser = null;
        result.version = null;
        result.minVersion = null;

        // Non supported browser.
        if (typeof window === 'undefined' || !window.navigator) {
            result.browser = 'Not a supported browser.';
            return result;
        }

        // Firefox.
        if (navigator.mozGetUserMedia) {
            result.browser = 'firefox';
            result.version = this.extractVersion(navigator.userAgent,
                /Firefox\/([0-9]+)\./, 1);
            result.minVersion = 30;
            return result;
        }

        // Chrome/Chromium/Webview.
        if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
            result.browser = 'chrome';
            result.version = this.extractVersion(navigator.userAgent,
                /Chrom(e|ium)\/([0-9]+)\./, 2);
            result.minVersion = 38;
            return result;
        }

        // Edge.
        if (navigator.mediaDevices &&
            navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
            result.browser = 'edge';
            result.version = this.extractVersion(navigator.userAgent,
                /Edge\/(\d+).(\d+)$/, 2);
            result.minVersion = 10547;
            return result;
        }

        // Non supported browser default.
        result.browser = 'Not a supported browser.';
        return result;
    }
}
