module.exports = options => {
    return {

        MenuID: { type: 'integer', preventUpdate: true, requiredOnInsert:true },
        UniqueOperatorID: { type: 'integer', preventUpdate: true, requiredOnInsert:true },        
        AccessDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true}
    }
}