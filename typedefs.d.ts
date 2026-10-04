
namespace CfsNodeCore.ORM{

    interface Dictionary<T> {
        [key: string]: T;
    }
   
    type genericType = string|number|boolean
    interface filterTypes { 
        /** 
         *  ```
         *    let where = {State:{'=':'NC'}}; // The shortform is {State:'NC'}
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */       
        '='?: genericType,
        
         /** 
          * Example Return Customers where State is not NC
         *  ```
         *    let where = {State:{'!=':'NC'}};  
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */    
        '!='?: genericType,

         /** 
          * Example Return Customers where State is not NC
         *  ```
         *    let where = {State:{'<>':'NC'}};  
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '<>'?: genericType,

         /** 
          * Example Return Customers where Plants are more than 3
         *  ```
         *    let where = {Plants:{'>':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '>'?: genericType,     
        
         /** 
          * Example Return Customers where Plants are less than 3
         *  ```
         *    let where = {Plants:{'<':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '<'?: genericType,   
        
         /** 
          * Example Return Customers where Customer has 3 or more Plants
         *  ```
         *    let where = {Plants:{'>=':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '>='?: genericType,

        /** 
         * Example Return Customers where Customer has 3 or more Plants
         *  ```
         *    let where = {Plants:{'=>':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '=>'?: genericType, 
        
         /** 
          * Example Return Customers where Customer has 3 or less Plants
         *  ```
         *    let where = {Plants:{'<=':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '<='?: genericType,

         /** 
          * Example Return Customers where Customer has 3 or less Plants
         *  ```
         *    let where = {Plants:{'=<':3}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '=<'?: genericType, 
        
         /** 
          * Example Return Customers where name starts with "Egg"
         *  ```
         *    let where = {CustName:{'%like':'Egg'}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '%like'?: genericType, 
        
         /** 
          * Example Return Customers where name ends with "Egg"
         *  ```
         *    let where = {CustName:{'like%':'Egg'}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        'like%'?: genericType, 
        
         /** 
          * Example Return Customers where name contains word "Egg"
         *  ```
         *    let where = {CustName:{'%like%':'Egg'}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        '%like%'?: genericType,  
        
         /** 
          * 
         * Example Return Customers where customer is in states NC,SC,GA,NY
         * Example 1)
         *  ```
         *    let where = {CustName:{'in':['NC','SC','GA','NY']}}; 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * 
         *  Example 2)
         *  ```
         *    let where = {CustName:['NC','SC','GA','NY']}; //The shorthand way 
         *    let customers = await inven.read('Customer',where)
         * 
         *  ```
         * */   
        'in'?: Array<genericType>,
    }
    interface FilterParams{
        [key: string]: string|number|boolean|Array<string|number|boolean>|filterTypes;

    }   
    
    interface DataParams{
        [key: string]: string|number|boolean;
    }

    type SqlServerORM = import('./SqlServerORM');

    type ProgressORM = import('./ProgressORM');

    type JsonFileDbORM = import('./JsonFileDbORM');

    interface OptionsParams{
        schema?: Schema
    }


    type SortObject = {
        dir: "-1" | "desc" | "1" | "asc";
        field:string;
    }

    interface ReadOptionsParams extends OptionsParams{

        /** Limits the number of records to return
         * @example
         ```
             let  topThreeOrders = await inven.read('OrderHeader',{ CustNum:'1' },{ limit:3 })
         ```
         * 
         */
        limit?:number;

        /**
         *  @alias limit
         * 
         *  Limits the number of records to return. Same as "limit". It is used to support kendo pagination
         * @example
         ```
             let  topThreeOrders = await inven.read('OrderHeader',{ CustNum:'1' },{ take:3 })
         ```
         */
        take?:number;

        /** Offsets.paginates the number of records to return
         * @example
         ```
             let  threeProductsOnSecondPage = await inven.read('Product',{ProdType:'Egg'},{ limit:3,offset:2 })
         ```
         * 
         */
        offset?:number;

         /** 
          *  @alias offset 
          * 
          *  Offsets.paginates the number of records to return. Same as "offset". It is used to support kendo pagination
          * @example
         ```
             let  threeProductsOnSecondPage = await inven.read('Product',{ProdType:'Egg'},{ take:3,skip:2 })
         ```
         * 
         */
        skip?:number;

         /** 
          * Sorting is kendo compatible
          * @example
         ```
             //Example 1 - Orders Sorted by OrdNum
             let  orders = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:'OrdNum' })

             //Example 2 - Orders Sorted by OrdNum and CustNum
             let  orders2 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:['OrdNum','CustNum'] })

             //Example 3 - Orders Sorted by OrdNum in ascending order
             let  orders3 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:{field:'OrdNum',dir:'asc'} })

             let  orders4 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:{field:'OrdNum',dir:'1'} })

             //Example 4 - Orders Sorted by OrdNum in descending order
             let  orders5 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:{field:'OrdNum',dir:'desc'} })

             let  orders6 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:{field:'OrdNum',dir:'-1'} })

             //Example 5 - Orders Sorted by OrdNum in descending order and CustNum in asc
             let  orders7 = await inven.read('OrderHeader',{ CustNum:'1' },{ sort:[{field:'OrdNum',dir:'-1'},{field:'CustNum':'1'}] })

         ```
         * 
         */
        sort?:Array<string> | string | SortObject | Array<SortObject>;

        /** 
          * flatBy tells ORM Read to return the result as flat array of singular value.
          * @example
         ```
             //Example 1 - Get Flat Array
             let serialnums = await inven.read('Serial',{ PalletNum:'0612345678' },{ flatBy:'SerialNum' })

             console.log(serialnums); //should display something like ['061234567801','061234567802','061234567803']

              //Example 2 - Get Singular Value with readOne
             let palletNum = await inven.readOne('Serial',{ SerialNum:'061234567801' },{ flatBy:'PalletNum' })

             console.log(palletNum); //should display something like '0612345678'
         ```
         * 
         */
        flatBy?:string;

    }

    interface InsertOptionsParams extends OptionsParams{
        /** If set to true then it will return the result implicitly so that you don't have to do seperate db.read() */
        returnResult?: boolean;
    }

    interface UpdateOptionsParams extends ReadOptionsParams{
        /** If set to true then it will return the result implicitly so that you don't have to do seperate db.read() */
        returnResult?: boolean;
    }

    interface SchemeMetaObject{
        /** USED by {SQLServerORM} for Progress Dataserver DB. In Progress the ID fields were really sequences so this tells ORM what is the sequence which is used as ID */
        progressDataServerIDSequence:string;

        /* Reference to the ID field of current schema */
        idField:string;

    }
    interface SchemeFieldModel { 
               
        /** This is autogenerated by ORM by reading DB schema. This is actual DB field name*/
        field?:string;

        /** ENUM of "string"|"date"|"datetime"|"time"|"boolean"|"integer"|"decimal" */
        type: "string"|"date"|"datetime"|"time"|"boolean"|"integer"|"decimal"; 
        defaultValueOnInsert?: 'CURRENT_TIMESTAMP'|genericType; 
        defaultValueOnUpdate?: 'CURRENT_TIMESTAMP'|genericType; 
        preventUpdate?: boolean; 
        preventSelection?: boolean; 
        relatedDateField?:string;
        relatedTimeField?:string;
        relatedDateTimeField?:string;
        requiredOnInsert?:boolean;
        requiredOnUpdate?:boolean;
        isID?:boolean;
        /**It tells ORM to increment the sequence value and use it as inserted value for this field */
        insertSequence?:string;

        /** Alternative field names if field is not found in data e.g. 
         * ```
         *  let serialSchemaOverride = {
         *      SerialNum:{type:'string',requiredOnInsert:true},
         *      Bloxnum: {type: 'string', alternatives:['BloxNumber']}
         *   }
         * 
         *  let schema = await inven.overrideSchemas('Serial',serialSchemaOverride)
         * 
         *  await inven.insert('Serial',{
         *       ...data,
         *       BloxNumber:'061234567890'
         *   },{schema}) 
         * 
         * ```
         */
        alternatives?: Array<string>; 

    }
    interface Schema{
        /**@private DO NOT MODIFY in application code. This is used by ORM to work with schema*/ 
        _meta?: SchemeMetaObject;
        [key: string]: SchemeFieldModel;
    }

    
}