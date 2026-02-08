declare global {
    namespace Express {
        interface Request {
            files?: {
                [fieldname: string]: Express.Multer.File[];
            } | Express.Multer.File[];
        }
    }
}
declare const app: import("express-serve-static-core").Express;
export default app;
//# sourceMappingURL=index.d.ts.map