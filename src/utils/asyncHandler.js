

const asyncHandler =(requesHandler)=>{
    (req,res,next)=>{
        Promise
        .resolve(requesHandler(req,res,next))
        .catch((error)=>next(error));
    }
}


export {asyncHandler};

// const asyncHandler =(fn)=> async(req,res,next)=>{
//    try {
//     await 

//    } catch (error) {
//     res.stauts(error.code || 500).json({
//         sucess:false,
//         message:error.message
//     })
//    }
// }
