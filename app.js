/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------
'use strict';

require('dotenv').config({silent: true});

var express	= require('express');
var app		= express();
var watson	= require('watson-developer-cloud');


// Bootstrap application settings
require('./config/express')(app);

// for STT
app.use('/api/speech-to-text/', require('./stt-token.js'));

// ------------------------------------
// for Conversation
// ------------------------------------
var conversation = watson.conversation({
	url: 'https://gateway.watsonplatform.net/conversation/api',
	username: process.env.CONVERSATION_USERNAME || '8c470cbd-de0f-4e11-88f0-967cdab7f16e',
	password: process.env.CONVERSATION_PASSWORD || 'c3D2eNZZ30UF',
	version: 'v1',
	version_date: '2016-12-15'
});

app.post('/question', function(req, res, next) {

	console.log(req.body);
	var param = {
			workspace_id: '06baf535-4700-4acd-9bf2-eda36b94cb04',
			input: req.body.question ,
			context: req.body.context
	};

	// conversationの実行	
	conversation.message( param, function(err, response) {
		res.set({'Access-Control-Allow-Origin': '*'});
    	if (err){
      		return next(err);
    	} else {
      		res.send(response);
  		}

 	});
});

// ------------------------------------
// for R&R
// ------------------------------------
var retrieve_and_rank = watson.retrieve_and_rank({
  username: '20ac04f7-76fd-4dc9-8006-6b01e9237854',
  password: 'QVxkDtm3EaAK',
  version: 'v1'
});

//  Use a querystring parser to encode output.
var qs = require('querystring');

app.post('/randr', function(req, res) {

	var params = {
	  cluster_id: 'sc8b20adbf_82c0_450d_968d_b07a4a54eba4',
	  collection_name: req.body.collection + '_faq'
	};
	
	var solrClient = retrieve_and_rank.createSolrClient(params);

	var ranker_id = req.body.ranker_id;
	var question  = req.body.question;
	var query     = qs.stringify({q: question, ranker_id: ranker_id, fl: 'id,title,body,ranker.confidence'});

	solrClient.get('fcselect', query, function(err, searchResponse) {
	  res.set({'Access-Control-Allow-Origin': '*'});
	  if(err) {
	    console.log('Error searching for documents: ' + err);
	    res.send("error");
	  } else {
	  	console.log('documents: ' + JSON.stringify(searchResponse.response.docs, null, 2));
	  	res.send(searchResponse.response, null, 2);
	  }
	});
});


// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
