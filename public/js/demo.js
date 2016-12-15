/* global $:true */

'use strict';

// STTの認証情報
var getSTTToken;
var $micButton = $('#micButton');
var deactivateMicButton = $micButton.removeClass.bind($micButton, 'active');

// conversationのステータスを格納するオブジェクト
var context={};

var realQ = "";

// 初期処理
$(function(){
	
	$('#msgArea').html("SBI証券のＦＡＱをご案内します。");
	
	// 音声認識用のトークン取得
	getSTTToken = $.ajax('https://takedemo003.mybluemix.net/api/speech-to-text/token');
	
	$micButton.click(function(){
	  	if($micButton.hasClass('active')){
	  		$micButton.removeClass('active');
	  	} else {
	  		$micButton.addClass('active');
	  		record();
	  	}
  });
	
	// 検索結果タイトルクリック時の処理
	$("#rankingArea").on("click", "div", function() { 
		// 詳細エリアに回答を表示
    	$("#detailArea").html($(this).next().html());
    	
    	// 長すぎる場合は
		$('#detailArea').readmore({
			speed: 1000,
			collapsedHeight: 300,
			moreLink: '<a href="#">続きを読む</a>',
			lessLink: '<a href="#">閉じる</a>'
		});
   		
	});
	
});


// conversationに会話を投げる
function askwatson(txt) {

	var question={text: txt};
	console.log("context:" + context);
	console.log("question:" + question.text);
	
	$.ajax({
	url: 'https://takedemo003.mybluemix.net/question',
	type: "POST",
	data: {
		"question" : question,
		"context"	: context
	},
	dataType: 'json',
	})
	.done(function(response){
		
		// 次の会話のためにcontextを保管
		context = response.context;
		console.log(response);
		
		$('#msgArea').html(trm(response.output.text));
		
		// conversationからの回答で種別が特定できればＲ＆Ｒへ。
		// できなければ質問を保存して種別の回答を促す。
		var kind = response.output.kind;
		if(kind == "unknown"){
			realQ = response.input.text;
		} else if(realQ == ""){
			callRR(kind, response.input.text);
		} else {
			callRR(kind, realQ);
		}
	})
	.fail(function( jqXHR, textStatus, errorThrown ){
		$('#msgArea').html("conversationでエラーが発生しました");
	});
	
	$("#QuestionText").val("");
}

// R&Rの結果表示
function showResult(response){
	$("#rankingArea").html("");
	var i = 0;
	for(var doc of response.docs){
		i = i + 1;
		if(i <= 5){
			$("#rankingArea").append('<div class="title"><dt><font color="blue">第' + i + '位(' +  Math.round( doc["ranker.confidence"]  * 100) + '%)</font></dt>'
			+ '<dt>' + doc.title + '</dt></div>');
			console.log(doc.body);
			$("#rankingArea").append('<div class="hiddenbody"><dt>' + doc.body + '</dt></div>');
		}
	}

}


// 配列から値のある要素を取り出す
function trm(ary){
	for(var txt of ary){
		if( txt != ""){
			return txt;
		}
	}
}

// R&Rを呼び出す
function callRR(kind, text){

	// conversationの回答とR&RのrankerIDの紐づけ用テーブル
	var kindTable = [
		["FX","fx","76643bx23-rank-1309"],
		["NISA","nisa","76643bx23-rank-1307"]
	];
	
	var collection;
	var id;
	
	for(var k of kindTable){
		if(k[0] == kind){
			collection = k[1];
			id = k[2];
		}
	}
	
	// R&Rに質問を投げる
	$.ajax({
		url: 'https://takedemo003.mybluemix.net/randr',
		type: "POST",
		data: {
			"collection": collection,
			"question"	: text,
			"ranker_id"	: id
		},
		dataType: 'json',
	})
	.done(function(response){
		realQ = "";
		showResult(response);
	})
	.fail(function( jqXHR, textStatus, errorThrown ){
		$('#msgArea').html("R&Rでエラーが発生しました");
	});
}

// 音声認識
function record(){

	getSTTToken.then(function(token) {
		$micButton.addClass('active');
		WatsonSpeech.SpeechToText.recognizeMicrophone({
			token: token,
			continuous: false,
			outputElement: $("#QuestionText")[0],
			model: "ja-JP_BroadbandModel",
			keepMicrophone: navigator.userAgent.indexOf('Firefox') > 0
		}).promise().then(function() {

		})
	.then(deactivateMicButton)
	.catch(deactivateMicButton);
	});
}
