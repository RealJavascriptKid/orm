module.exports = options => {
    return {
        'DeviceType':'string',
        'MACAddress':'string',
        'OperatorID':'string',
        "LastActivity": {type:"datetime",defaultValueOnInsert:'SYSTIMESTAMP',defaultValueOnUpdate:'SYSTIMESTAMP'},      
        'ConnectID':'integer'
    }   
}