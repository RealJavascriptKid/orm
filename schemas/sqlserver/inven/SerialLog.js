module.exports = options => {

    
    return {
        //PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        TransNum:{type:'integer',preventInsert:true},
        SerialNum:'string',
        Operator:'string',
        FromLocCode:'string',
        ToLocCode:'string',
        MoveDate:{type:'date',defaultValueOnInsert: 'CURRENT_TIMESTAMP'}, 
        MoveTime:{type:'time',defaultValueOnInsert: 'CURRENT_TIMESTAMP',format:'HHmm'}, 
        MoveDateTime:{type:'datetime',defaultValueOnInsert: 'CURRENT_TIMESTAMP'}, 
        ProdCode:'string',
        OtherValue:'string',
        OtherType:'string',
        ProcessName:'string',
        NetWgt:'decimal',
        KillDate:'date',
        PdnDate:'date',
        SellByDate:'date',
        PalletNum:'string',
        OrdRefNum:{type:'integer',defaultValueOnInsert:0},
        OrdRefLine:{type:'integer',defaultValueOnInsert:0},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP',  preventSelection: true },
        Shift: 'string'
    }
}