class ApiError extends Error {
    constructor(
        statusCode,
        message='something went wrong',
        error=[],
        statck=""

    ){
        super(message);
        this.statusCode = statusCode;
        this.data=null
        this.message = message
        this.sucess =false;
        
        this.error = error;

        if(statck){
            this.statck = statck;
        }
        else{
            Error.captureStackTrace(this,this.constructor);

        }

    }
}

export default ApiError;