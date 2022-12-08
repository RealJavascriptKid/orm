module.exports = options => {

    return {
        'DeviceType':'string',
        'MACAddress':'string',
        'IPAddress':'string',
        'DeviceName':'string',        
        'AllowedConnections':'integer',
        'AlternateMACAddress':'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'DeviceRegistry-seq'},
    }   

}