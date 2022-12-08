module.exports = options => {
    //return ['MsgDate', 'MsgTime', 'MsgText', 'MsgData', 'MsgTable', 'NameValuePairs', 'InProcess']

    return {
        MsgDate:{type:'date',defaultValueOnInsert:'SYSTIMESTAMP'},
        MsgTime:{type:'time',defaultValueOnInsert:'SYSTIMESTAMP',format:'HH:mm:ss'},
        MsgTable:{type:'string'},
        InProcess:{type:'boolean',defaultValueOnInsert:false},
        MsgData:{type:'string'},
        MsgTransNum:{type:'integer',insertSequence:'QMsgSeq',preventInsert:true,preventUpdate:true},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP', preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'QMessage-seq'},
    }
}