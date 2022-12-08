module.exports = options => {

    return {
        "ConnectID": "integer",
        "DeviceType": "string",
        "IPAddress": "string",
        "LoginDateTime": {type:"datetime",defaultValueOnInsert:'SYSTIMESTAMP'},
        "MACAddress": "string",
        "Operator": "string"
    }

}