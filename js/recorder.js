// functions to provide a recorder on the page
// pages that include this .js module will ask permission to use the microphone

$(function(){
    $("#recorder").load("recorder.html");
});

var duration = 10.0;

// List of stimuli (words) to present to participant.
let stimuli = [
    'ship',
    'boat'
];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

window.onload = function init() {
    var result = recorder.detectBrowser();
    console.log(result.browser + " " + result.version + ",  version " + result.minVersion + " is required.");
    if (result.browser == 'Not a supported browser.') {
	var message = document.getElementById('message');
	message.innerHTML = '<b>Sorry</b>: Use Firefox (> version 30) or Chrome (> version 37) to view this page.';
	return;
    } 
    if (result.version < result.minVersion)  {
	var message = document.getElementById('message');
	if (result.browser == 'firefox') {
	    message.innerHTML = '<b>Sorry</b>: Firefox version 31 or higher is required';
	}
	if (result.browser== 'chrome') {
	    message.innerHTML = '<b>Sorry</b>: Chrome version 38 or higher is required';
	}
	return;
    }

    //  here we are setting the subject number, token number etc.  
    var uid = getRandomInt(1,900000);  // for the moment, just a random integer
    localStorage.setItem('uid',uid);
    localStorage.setItem('stim',-1);

    recorder.init();
    recorder.stopbutton_name = 'stopbutton';

    $("#recorder").show();  // make recorder.html visible 
    next_stim();
};

function startRecording(button) {
    button.disabled = true;
    button.style.visibility="hidden";

    document.getElementById("stopbutton").disabled = false;
    document.getElementById("stopbutton").style.visibility="visible";

    console.log('Recording...');
    recorder.start_recording(duration);
}

function stopRecording(button) {
    button.disabled = true;
    button.style.visibility = "hidden";

    document.getElementById("startbutton").disabled = false;
    document.getElementById("startbutton").style.visibility = "visible";

    if (recorder.recording == true) {  // if user stops before duration is up
	recorder.stop_recording();
    }

    recorder.decimate();  // if the sampling rate is > 44k we will halve it

    plotWAV();   // put it on the waveform canvas
    fill_page_audio();  // link it to the <audio> object
    upload_audio();  // send it up to the server
}

function fill_page_audio() {
    var blob = recorder.exportWAV(true);  //false = stereo
    var url = URL.createObjectURL(blob);
    var audio = document.getElementById('recorded_audio');
    audio.src = url;
    audio.type = "audio/wav";
}

function upload_audio() {
    var blob = recorder.exportWAV(true);  //true = mono
    var filename = localStorage.getItem('uid') + "_" + 
	localStorage.getItem('stim') + "_" +
	localStorage.getItem('rep') + ".wav";

    console.log("saving " + filename);

    localStorage.setItem('rep',Number(localStorage.getItem('rep'))+1);  // increment rep 

    var fd = new FormData();
    fd.append('file',blob, filename);
    $.ajax({
        type: 'POST',
        url: 'upload.php',
        data: fd,
        processData: false,
        contentType: false
    });
}

function plotWAV() {   
    console.log('plotWAV');
    var canvas = document.getElementById( "wavedisplay" );
    var step = Math.ceil( recorder.audio_buffer.length / canvas.width );
    var amp = canvas.height / 2;

    context = canvas.getContext('2d');
    context.fillStyle = "silver";
    context.clearRect(0,0,canvas.width,canvas.height);
    for(var i=0; i < canvas.width; i++){
        var min = 1.0;
        var max = -1.0;
        for (j=0; j<step; j++) {
            var datum = recorder.audio_buffer[(i*step)+j]; 
            if (datum < min)
                min = datum;
            if (datum > max)
                max = datum;
        }
        context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
    }
}

function next_stim() {
    let stimnum = Number(localStorage.getItem('stim')) + 1;
    if (stimnum >= stimuli.length) {
        window.location.replace('thanks.html');
    } else {
        localStorage.setItem('stim',stimnum);  // increment stim 
        localStorage.setItem('rep',0);
        document.getElementById('word').textContent = stimuli[stimnum];
    }
}
