module.exports = options => {

    return {
        ActiveStatus: { type: "boolean" },
        ActiveStatusDateTime: { type: "datetime" },
        CanMoveBoxesIn: {type:"boolean", defaultValueOnInsert:false},
        CanMoveBoxesOut: {type:"boolean", defaultValueOnInsert:false},
        ChangeDT: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
        ChangeOperator: { type: "string" },
        ChangeReason: { type: "string", defaultValueOnInsert:'Create', defaultValueOnUpdate:'Update' },
        Descr: { type: "string" },
        ID: { type: "integer", preventInsert: true, preventUpdate: true },
        IsBinLocation: {type:"boolean", defaultValueOnInsert:false},
        IsHoldLocation: {type:"boolean", defaultValueOnInsert:false},
        IsInvLocation: {type:"boolean", defaultValueOnInsert:false},
        IsLoadArea: {type:"boolean"},
        IsPickLocation: {type:"boolean", defaultValueOnInsert:false},
        IsProductionLocation: {type:"boolean", defaultValueOnInsert:false},
        IsRackLocation: {type:"boolean", defaultValueOnInsert:false},
        IsReworkLocation: {type:"boolean", defaultValueOnInsert:false},
        IsTermLocation: {type:"boolean", defaultValueOnInsert:false},
        LocCode: {type:"string", requiredOnInsert:true},
        LocGroup: { type: "string" },
        LocType: { type: "string" },
        //NameValuePairs:{type:"string"},
        NumPalletsAllowed: { type: "integer" },
        OrdNum: { type: "string" },
        OtherFlags: { type: "string" },
        ZuluDepartment: { type: "string" },
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true }

    }
}