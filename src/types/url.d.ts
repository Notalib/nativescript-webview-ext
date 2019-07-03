declare module "url" {
    export interface ParsedUrlQuery {
        [key: string]: string | string[];
    }

    export class Url {
        protocol?: string | null;
        slashes?: boolean | null;
        auth?: string | null;
        host?: string | null;
        port?: string | null;
        hostname?: string | null;
        hash?: string | null;
        search?: string | null;
        query?: string | null | ParsedUrlQuery;
        pathname?: string | null;
        path?: string | null;
        href?: string | null;
        public format(): string;
        public resolve(relative: Url): string;
        public resolveObject(source: string, relative: string): Url;
    }

    export function parse(input: string): Url;
    export function format(url: Url): string;
    export function resolve(source: Url, relative: Url): string;
    export function resolveObject(source: string, relative: string): Url;
}
