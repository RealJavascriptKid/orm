module.exports = options => {
    return {
        "ConnectID": "integer",
        "DeviceType": "string",
        "IPAddress": "string",
        "LoginDateTime": {type:"datetime",defaultValueOnInsert:'CURRENT_TIMESTAMP'},
        "MACAddress": "string",
        "Operator": "string"
    }
}