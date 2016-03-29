(function(root,undefined){function repeatZero(qty){var result="";qty=parseInt(qty,10);if(!qty||qty<1){return result;}
while(qty){result+="0";qty-=1;}
return result;}
function padZero(str,len,isRight){if(str==null){str="";}
str=""+str;return(isRight?str:"")+repeatZero(len-str.length)+(isRight?"":str);}
function isArray(array){return Object.prototype.toString.call(array)==="[object Array]";}
function isObject(obj){return Object.prototype.toString.call(obj)==="[object Object]";}
function findLast(array,callback){var index=array.length;while(index-=1){if(callback(array[index])){return array[index];}}}
function find(array,callback){var index=0,max=array.length,match;if(typeof callback!=="function"){match=callback;callback=function(item){return item===match;};}
while(index<max){if(callback(array[index])){return array[index];}
index+=1;}}
function each(array,callback){var index=0,max=array.length;if(!array||!max){return;}
while(index<max){if(callback(array[index],index)===false){return;}
index+=1;}}
function map(array,callback){var index=0,max=array.length,ret=[];if(!array||!max){return ret;}
while(index<max){ret[index]=callback(array[index],index);index+=1;}
return ret;}
function pluck(array,prop){return map(array,function(item){return item[prop];});}
function compact(array){var ret=[];each(array,function(item){if(item){ret.push(item);}});return ret;}
function unique(array){var ret=[];each(array,function(_a){if(!find(ret,_a)){ret.push(_a);}});return ret;}
function intersection(a,b){var ret=[];each(a,function(_a){each(b,function(_b){if(_a===_b){ret.push(_a);}});});return unique(ret);}
function rest(array,callback){var ret=[];each(array,function(item,index){if(!callback(item)){ret=array.slice(index);return false;}});return ret;}
function initial(array,callback){var reversed=array.slice().reverse();return rest(reversed,callback).reverse();}
function extend(a,b){for(var key in b){if(b.hasOwnProperty(key)){a[key]=b[key];}}
return a;}
var moment;if(typeof require==="function"){try{moment=require('moment');}
catch(e){}}
if(!moment&&root.moment){moment=root.moment;}
if(!moment){throw"Moment Duration Format cannot find Moment.js";}
moment.duration.fn.format=function(){var tokenizer,tokens,types,typeMap,momentTypes,foundFirst,trimIndex,args=[].slice.call(arguments),settings=extend({},this.format.defaults),remainder=moment.duration(this);settings.duration=this;each(args,function(arg){if(typeof arg==="string"||typeof arg==="function"){settings.template=arg;return;}
if(typeof arg==="number"){settings.precision=arg;return;}
if(isObject(arg)){extend(settings,arg);}});types=settings.types=(isArray(settings.types)?settings.types:settings.types.split(" "));if(typeof settings.template==="function"){settings.template=settings.template.apply(settings);}
tokenizer=new RegExp(map(types,function(type){return settings[type].source;}).join("|"),"g");typeMap=function(token){return find(types,function(type){return settings[type].test(token);});};tokens=map(settings.template.match(tokenizer),function(token,index){var type=typeMap(token),length=token.length;return{index:index,length:length,token:(type==="escape"?token.replace(settings.escape,"$1"):token),type:((type==="escape"||type==="general")?null:type)};},this);momentTypes=intersection(types,unique(compact(pluck(tokens,"type"))));if(!momentTypes.length){return pluck(tokens,"token").join("");}
each(momentTypes,function(momentType,index){var value,wholeValue,decimalValue,isLeast,isMost;value=remainder.as(momentType);wholeValue=(value>0?Math.floor(value):Math.ceil(value));decimalValue=value-wholeValue;isLeast=((index+1)===momentTypes.length);isMost=(!index);each(tokens,function(token){if(token.type===momentType){extend(token,{value:value,wholeValue:wholeValue,decimalValue:decimalValue,isLeast:isLeast,isMost:isMost});if(isMost){if(settings.forceLength==null&&token.length>1){settings.forceLength=true;}}}});remainder.subtract(wholeValue,momentType);});if(settings.trim){tokens=(settings.trim==="left"?rest:initial)(tokens,function(token){return!(token.isLeast||(token.type!=null&&token.wholeValue));});}
foundFirst=false;if(settings.trim==="right"){tokens.reverse();}
tokens=map(tokens,function(token){var val,decVal;if(!token.type){return token.token;}
if(token.isLeast&&(settings.precision<0)){val=(Math.floor(token.wholeValue*Math.pow(10,settings.precision))*Math.pow(10,-settings.precision)).toString();}else{val=token.wholeValue.toString();}
val=val.replace(/^\-/,"");if(token.length>1&&(foundFirst||token.isMost||settings.forceLength)){val=padZero(val,token.length);}
if(token.isLeast&&(settings.precision>0)){decVal=token.decimalValue.toString().replace(/^\-/,"").split(/\.|e\-/);switch(decVal.length){case 1:val+="."+padZero(decVal[0],settings.precision,true).slice(0,settings.precision);break;case 2:val+="."+padZero(decVal[1],settings.precision,true).slice(0,settings.precision);break;case 3:val+="."+padZero(repeatZero((+decVal[2])-1)+(decVal[0]||"0")+decVal[1],settings.precision,true).slice(0,settings.precision);break;default:throw"Moment Duration Format: unable to parse token decimal value.";}}
if(token.isMost&&token.value<0){val="-"+val;}
foundFirst=true;return val;});if(settings.trim==="right"){tokens.reverse();}
return tokens.join("");};moment.duration.fn.format.defaults={escape:/\[(.+?)\]/,years:/[Yy]+/,months:/M+/,weeks:/[Ww]+/,days:/[Dd]+/,hours:/[Hh]+/,minutes:/m+/,seconds:/s+/,milliseconds:/S+/,general:/.+?/,types:"escape years months weeks days hours minutes seconds milliseconds general",trim:"left",precision:0,forceLength:null,template:function(){var types=this.types,dur=this.duration,lastType=findLast(types,function(type){return dur._data[type];});switch(lastType){case"seconds":return"h:mm:ss";case"minutes":return"d[d] h:mm";case"hours":return"d[d] h[h]";case"days":return"M[m] d[d]";case"weeks":return"y[y] w[w]";case"months":return"y[y] M[m]";case"years":return"y[y]";default:return"y[y] M[m] d[d] h:mm:ss";}}};})(this);