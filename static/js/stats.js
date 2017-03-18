var dataObj = {
  'srcs': {},
  'pairs': {},
  'bases': {},
  'coins': {}
};
$('#infolink').click(function(){$('#infolinkcaret').toggleClass('fa-caret-up fa-caret-down');});

var getStats = function(dtype,cb){$.getJSON('/api/stats/'+dtype,function(data){ cb({dtype, data}); });};
for(var dtype in dataObj){
  getStats(dtype,function(dat){
    $('#'+dat.dtype+'count').text(Object.keys(dat.data).length);
    $('#'+dat.dtype+'stats').css('height','420px');
    $('#'+dat.dtype+'stats').css('overflow','hidden');
    $('#'+dat.dtype+'stats').click(function(){
      if($('#'+dat.dtype+'stats').css('height') === '420px'){
        $('#'+dat.dtype+'stats').css('height','auto');
      }else{
        $('#'+dat.dtype+'stats').css('height','420px');
      }
    });
    for(var targ in dat.data){
      var out = '<li>'+targ;
      switch (dat.dtype) {
        case 'srcs':
          out += '<span class="pull-right"><a href="https://'+dat.data[targ].site+'" target="_blank">'+dat.data[targ].name+'</a></span></li>';
          break;
        default:
      }
      $('#'+dat.dtype+'ul').append(out+'</li>');
    }
  });
}

var updateTicker = function(){
  $.getJSON('/api/indx',function(result){
    $('.tickerli').remove();
    var ts = null;
    for(var pair in result){
      if(ts === null){
        ts = result[pair][1].split('T');
        var tm = ts[1].split('.');
        $('#subhead').text('Last Update: '+ts[0]+' | '+tm[0]+' (GMT)');
      }
      if(pair != 'doge_btc'){$('#tickerul').append('<li class="tickerli"><a href="#">'+pair+' : <br>'+result[pair][0].toPrecision(7)+'</a></li>');}
    }
  });
};
updateTicker();
setInterval(function(){updateTicker();}, 60000);
// $.getJSON('/api/bases',function(result){
//   $('#basecount').text(Object.keys(result).length);
//   for(var base in result){ $('#basesul').append('<li>'+base+'</li>'); }
// });
// $.getJSON('/api/coins',function(result){
//   $('#coincount').text(Object.keys(result).length);
//   for(var coin in result){if(result[coin].length > 2){$('#coinsul').append('<li>'+coin+'</li>');}}
//   $('#coinsul').append('<li>...</li>');
// });
// $.getJSON('/api/pairs',function(result){
//   $('#paircount').text(Object.keys(result).length);
//   for(var pair in result){
//     if(result[pair].length > 2){
//       $('#pairsul').append('<li>'+pair+'</li>');
//     }
//   }
//   $('#pairsul').append('<li>...</li>');
// });
