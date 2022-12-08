module.exports = options => {
    return {
        Operator:'string',
        Password:'string',
        PlantId:{type:'integer',defaultValueOnInsert:options.plantid},
        FirstName:'string',
        LastName:'string',
        GroupCode:'string',
        "Lang-Code":'string',
        NameValuePairs:'string',
        AccessType:'string',       
        UsingAD:'boolean',
        UseDevicePin:'boolean',
        ADAuthentication:'boolean',
        ADGroup:'boolean',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'Operator-seq'},
        _nvp:{
            GuiUser:'string',
            DeviceAdmin:'string',
        }
    }
}