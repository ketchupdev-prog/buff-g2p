// Minimal type declarations for modules without @types

declare module 'express' {
  export interface Request {
    body: any;
    params: any;
    query: any;
    headers: any;
    header(name: string): string | undefined;
    accepts(type?: string | string[]): string | string[] | false;
    acceptsCharsets(charset?: string | string[]): string | string[] | false;
    acceptsEncodings(encoding?: string | string[]): string | string[] | false;
    acceptsLanguages(lang?: string | string[]): string | string[] | false;
    ip: string;
    ips: string[];
    method: string;
    path: string;
    protocol: string;
    secure: boolean;
    stale: boolean;
    subdomains: string[];
    xhr: boolean;
    get(name: string): string | undefined;
  }
  
  export interface Response {
    status(code: number): this;
    json(body: any): this;
    send(body?: any): this;
    sendFile(path: string): this;
    download(path: string, filename?: string): this;
    format(obj: any): this;
    jsonp(body: any): this;
    redirect(status: number, url: string): this;
    redirect(url: string): this;
    render(view: string, locals?: any, callback?: (err: Error, html: string) => void): this;
    sendStatus(code: number): this;
    set(field: any): this;
    set(field: string, value: string): this;
    setHeader(name: string, value: string | number | string[]): this;
    getHeader(name: string): string | number | string[] | undefined;
    removeHeader(name: string): this;
    type: string;
    statusCode: number;
    locals: any;
    append(field: string, value?: string): this;
    cookie(name: string, value: string, options?: any): this;
    clearCookie(name: string, options?: any): this;
    location(url: string): this;
  }
  
  export interface NextFunction {
    (err?: any): void;
  }
  
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
  export type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => void;
  
  function express(): express.Application;
  export = express;
  export default express;
  
  namespace express {
    interface Application {
      use(handler: RequestHandler | ErrorRequestHandler): Application;
      get(path: string, ...handlers: RequestHandler[]): Application;
      post(path: string, ...handlers: RequestHandler[]): Application;
      put(path: string, ...handlers: RequestHandler[]): Application;
      delete(path: string, ...handlers: RequestHandler[]): Application;
      patch(path: string, ...handlers: RequestHandler[]): Application;
      options(path: string, ...handlers: RequestHandler[]): Application;
      listen(port: number, hostname?: string, backlog?: number, callback?: () => void): any;
      listen(port: number, callback?: () => void): any;
    }
    
    function json(options?: any): RequestHandler;
    function urlencoded(options?: any): RequestHandler;
    function static(root: string, options?: any): RequestHandler;
    function Router(options?: any): any;
  }
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  
  interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string, cb: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }
  
  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}

declare module 'morgan' {
  import { Request, Response } from 'express';
  
  type LoggerFormat = string | ((req: Request, res: Response) => string);
  type TokenCallback = (req: Request, res: Response, arg?: string | undefined) => string;
  
  interface LoggerOptions {
    buffer?: boolean;
    immediate?: boolean;
    skip?: (req: Request, res: Response) => boolean;
    stream?: { write: (message: string) => void };
  }
  
  function morgan(format?: LoggerFormat, options?: LoggerOptions): (req: Request, res: Response, next: () => void) => void;
  
  export default morgan;
}
