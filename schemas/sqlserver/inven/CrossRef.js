module.exports = options => {
     return  { 
        Class:{type:'string',alternatives:['Application']},
        SubClass:{type:'string',alternatives:['ID']},
        XRefValue:{type:'string',alternatives:['Descr']},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true }
    }
}
    