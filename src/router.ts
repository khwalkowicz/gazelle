import { ALL_HTTP_METHODS, type Method } from './method.ts';
import { type IFindResult, RouterNode } from './node.ts';

export interface IRouteDefinition<THandler> {
  readonly path: string;
  readonly methods: Method[];
  readonly handler: THandler;
}

export class Router<THandler> {
  private readonly nodes: Record<Method, RouterNode<THandler>> = {
    GET: new RouterNode(),
    POST: new RouterNode(),
    PATCH: new RouterNode(),
    PUT: new RouterNode(),
    DELETE: new RouterNode(),
  };

  constructor(routes?: IRouteDefinition<THandler>) {
    if (routes) {
      this.on(routes);
    }
  }

  on(path: string, method: Method, handler: THandler): void;
  on(
    path: string,
    method: readonly Method[],
    handler: THandler,
  ): void;
  on(path: string, handler: THandler): void;
  on(route: IRouteDefinition<THandler>): void;
  on(routes: IRouteDefinition<THandler>[]): void;
  on(
    pathOrRoutes: string | IRouteDefinition<THandler> | IRouteDefinition<
      THandler
    >[],
    methodsOrHandler?: Method | readonly Method[] | THandler,
    handler?: THandler,
  ): void {
    if (Array.isArray(pathOrRoutes)) {
      return pathOrRoutes.forEach((route) => this.on(route));
    }

    if (typeof pathOrRoutes === 'object') {
      return this.on(
        pathOrRoutes.path,
        pathOrRoutes.methods,
        pathOrRoutes.handler,
      );
    }

    const methods: readonly Method[] = Array.isArray(methodsOrHandler)
      ? methodsOrHandler as readonly Method[]
      : typeof methodsOrHandler === 'string'
      ? [methodsOrHandler as Method]
      : ALL_HTTP_METHODS;

    const actualHandler = handler ??
      methodsOrHandler as THandler;

    methods.forEach((m) => {
      this.nodes[m].add(pathOrRoutes, actualHandler);
    });
  }

  get(path: string, handler: THandler): void {
    return this.on(path, 'GET', handler);
  }

  post(path: string, handler: THandler): void {
    return this.on(path, 'POST', handler);
  }

  put(path: string, handler: THandler): void {
    return this.on(path, 'PUT', handler);
  }

  patch(path: string, handler: THandler): void {
    return this.on(path, 'PATCH', handler);
  }

  delete(path: string, handler: THandler): void {
    return this.on(path, 'DELETE', handler);
  }

  find(
    path: string,
    method: Method,
  ): IFindResult<THandler> | undefined {
    return this.nodes[method].get(path);
  }
}
