module.exports = options => {
    //return ['MsgDate', 'MsgTime', 'MsgText', 'MsgData', 'MsgTable', 'NameValuePairs', 'InProcess']

    return {
        MsgDate:{type:'date',defaultValueOnInsert:'CURRENT_TIMESTAMP'},
        MsgTime:{type:'time',defaultValueOnInsert:'CURRENT_TIMESTAMP'},
        MsgTable:{type:'string'},
        InProcess:{type:'boolean',defaultValueOnInsert:false},
        MsgData:{type:'string'},
        MsgTransNum:{type:'integer',preventInsert:true,preventUpdate:true},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
    }
}