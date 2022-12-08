module.exports = options => {

    return {
        DeviceType:'string',
        MACAddress:'string',
        OperatorID:'string',
        LastActivity: {type:"datetime",defaultValueOnInsert:'SYSTIMESTAMP',defaultValueOnUpdate:'SYSTIMESTAMP'},      
        SecureID:'string',
        SessionID:'integer',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'DeviceConnection-seq'},
    }

}