var url = require('url');

var queryStringMap = function(data) {
	var result = {};
	data.split('&').forEach(function(entry) {
		result[
				decodeURIComponent(entry.substring(0, entry.indexOf('=')))] =
				decodeURIComponent(entry.substring(entry.indexOf('=') + 1));
	});
	return result;
};

var listOfQueryStringMaps = function(data) {
	var result = [];
	data.split(',').forEach(function(entry) {
		result.push(queryStringMap(entry));
	});
	return result;
};

var computeFormats = function(embedUrl, data, callback) {
	let format = null;
	let foundAudio = false;
	let audio = null;
	let foundVideo = false;
	let video = null;

	let firstVideo = null;

	data.url_encoded_fmt_stream_map.forEach(function(videoEntry) {
		//if (videoEntry.quality != 'medium') return;
		//if (videoEntry.type.indexOf('mp4') == -1) return;
		
		firstVideo = videoEntry;

		if(videoEntry.itag == 140) {
			audio = videoEntry;
			foundAudio = true;
		}
		else if(videoEntry.itag == 18) {
			video = videoEntry;
			foundVideo = true;
		}
	});

	if(foundAudio && isAudio)
		format = audio;
	else
		format = video;

	if(!format){
		format = firstVideo;
	}

	fetch(embedUrl).then((data) => {

		data.text().then((r)=>{
				var m;
				var player_url = '';

				const regex = /<script.*?"(\/yts\/jsbin\/player.*?)"/;

				//m = regex.exec(r);
				m = r.match(regex);
				//console.log(m);
				player_url = m[1];

				if(callback)
					callback({'status': true, 'playerUrl': player_url, 'format': format});
			});
		});
};

module.exports = {
  getURL: function (videoId, isAudio, callback) {

		var infoUrl = 'http://www.youtube.com/get_video_info?video_id=' + videoId+
		'&eurl=https://youtube.googleapis.com/v/' + videoId;
		var embedUrl = 'http://www.youtube.com/embed/' + videoId;

		fetch(infoUrl).then((data) => {

			if(data.status != 200)
				callback({'status': false});

			data.text().then((data)=> {

				data = queryStringMap(data);


	    	if (typeof data['url_encoded_fmt_stream_map'] == 'string' && data['url_encoded_fmt_stream_map'] != "") {
	    		data['url_encoded_fmt_stream_map'] = listOfQueryStringMaps(data['url_encoded_fmt_stream_map']);

					computeFormats(embedUrl, data, callback);
	    	}
				else {

					infoUrl = 'https://www.youtube.com/watch?v='+videoId;

					fetch(infoUrl).then((dataS) => {
						if(dataS.status != 200)
							callback({'status': false});



							dataS.text().then(function (text) {

							try {
								text = text.match(/\"url_encoded_fmt_stream_map\":\"([^"])+\"/)[0];

								text = text.replace('"url_encoded_fmt_stream_map":"', '').slice(0, -1);

						   text = text.replace(/\\u[\dA-F]{4}/gi,
						          function (match) {
						               return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
						    		 	});

								data['url_encoded_fmt_stream_map'] = listOfQueryStringMaps(text);

								computeFormats(embedUrl, data, callback);
							}
							catch(err) {
								if(callback)
									callback({'status': false, 'playerUrl': null, 'format': null, 'data': data});

									return;
							}
						});
					});
				}
			});

	    //		console.log(JSON.stringify(data.url_encoded_fmt_stream_map, null, '\t'));

	      // 18 & 140 itags formats

  	});
	}

};
