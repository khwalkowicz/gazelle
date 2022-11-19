import type { ConnInfo, Handler } from 'https://deno.land/std@0.161.0/http/mod.ts';
import type { IFindResult } from './node.ts';
import { type IRouteDefinition, Router } from './router.ts';
import { stringIsMethod } from './method.ts';

export type RequestContext = ConnInfo & {
  readonly pathname: string;
  readonly query: URLSearchParams;
  readonly params: Record<string, string>;
};

export type RequestHandler<TContext extends RequestContext = RequestContext> = (
  req: Request,
  ctx: TContext,
) => Response | Promise<Response>;

const defaultNotFoundHandler = <
  TContext extends RequestContext = RequestContext,
>(_req: Request, _ctx: TContext) =>
  new Response(
    JSON.stringify({ status: 404, message: 'Not Found' }),
    { status: 404, statusText: 'Not Found' },
  );

const defaultErrorHandler = <
  TContext extends RequestContext = RequestContext,
>(_req: Request, _ctx: TContext) =>
  new Response(
    JSON.stringify({ status: 500, message: 'InternalServerError' }),
    { status: 500, statusText: 'Internal Server Error' },
  );

export interface IRouterConfig<
  TContext extends RequestContext = RequestContext,
> {
  readonly routes?: IRouteDefinition<RequestHandler<TContext>>;
  readonly notFoundHandler?: RequestHandler<TContext>;
  readonly internalServerErrorHandler?: RequestHandler<TContext>;
}

export class HandlerRouter<TContext extends RequestContext = RequestContext> extends Router<RequestHandler<TContext>> {
  notFoundHandler: RequestHandler<TContext>;

  internalServerErrorHandler: RequestHandler<TContext>;

  constructor(config?: IRouterConfig<TContext>) {
    super(config?.routes);

    this.notFoundHandler = config?.notFoundHandler ?? defaultNotFoundHandler;
    this.internalServerErrorHandler = config?.internalServerErrorHandler ??
      defaultErrorHandler;
  }

  handle(baseUrl?: string | URL): Handler {
    return async (req, connInfo) => {
      const method = req.method;
      const url = new URL(req.url, baseUrl);

      const context: RequestContext = {
        ...connInfo,
        pathname: url.pathname,
        params: {},
        query: url.searchParams,
      };

      if (!stringIsMethod(method)) {
        return this.notFoundHandler(req, context as TContext);
      }

      let match: IFindResult<RequestHandler<TContext>> | undefined;

      try {
        match = this.find(url.pathname, method);
        if (!match) {
          return this.notFoundHandler(req, context as TContext);
        }
      } catch (error) {
        console.error(error);
        return this.internalServerErrorHandler(req, context as TContext);
      }

      const ctxWithParams = { ...context, params: match.params } as TContext;

      try {
        return await match.value(req, ctxWithParams);
      } catch (error) {
        console.error(error);
        return this.internalServerErrorHandler(req, ctxWithParams);
      }
    };
  }
}
