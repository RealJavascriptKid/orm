module.exports = options => {
   

    return {
        DeviceConnectionID :{type:'integer',preventInsert:true,preventUpdate:true},
        DeviceType:'string',
        MACAddress:'string',
        OperatorID:'string',
        LastActivity: {type:"datetime",defaultValueOnInsert:'CURRENT_TIMESTAMP',defaultValueOnUpdate:'CURRENT_TIMESTAMP'},      
        ConnectID:'integer',
        MenuID:'integer',
        SessionID:'string',
    }
}