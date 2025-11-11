export namespace main {
	
	export class HTTPCookie {
	    name: string;
	    value: string;
	    domain: string;
	    path: string;
	    // Go type: time
	    expires: any;
	    secure: boolean;
	    httpOnly: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HTTPCookie(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.domain = source["domain"];
	        this.path = source["path"];
	        this.expires = this.convertValues(source["expires"], null);
	        this.secure = source["secure"];
	        this.httpOnly = source["httpOnly"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HTTPRequest {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    query: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new HTTPRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.query = source["query"];
	    }
	}
	export class HTTPResponse {
	    statusCode: number;
	    status: string;
	    headers: Record<string, Array<string>>;
	    cookies: HTTPCookie[];
	    body: string;
	    size: number;
	    duration: number;
	
	    static createFrom(source: any = {}) {
	        return new HTTPResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.statusCode = source["statusCode"];
	        this.status = source["status"];
	        this.headers = source["headers"];
	        this.cookies = this.convertValues(source["cookies"], HTTPCookie);
	        this.body = source["body"];
	        this.size = source["size"];
	        this.duration = source["duration"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

