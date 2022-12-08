module.exports = options => {

    //"SapLogSer" schema mostly same as "SerialLog" except three fields
    let data = require('./SerialLog')(options);
    delete data.MoveDateTime;
    //UOM,Qty
    data.UOM = {type:'string',defaultValue:'Case'}
    data.Qty = {type:'integer',defaultValue:1}
    //data.RecordSeq = {type:'integer',insertSequence:'SapLogSer-seq'}
    return data;
}