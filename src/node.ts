import { WILDCARD_SIGN } from './constants.ts';
import {
  getCommonSubstring,
  type IGetCommonSubstringResult,
  splitByNextParam,
  splitStringToFirstOccurence,
} from './utils.ts';

type MatchSubtreeResult = IGetCommonSubstringResult & {
  readonly childPath?: string;
};

export interface IFindResult<TValue> {
  readonly params: Record<string, string>;
  readonly value: TValue;
}

export class RouterNode<TValue> {
  private parent?: RouterNode<TValue>;

  private sortedStaticChildren: RouterNode<TValue>[] = [];
  private sortedParamChildren: RouterNode<TValue>[] = [];

  constructor(
    readonly pathname = '',
    public value?: TValue,
    private readonly staticChildren: Record<string, RouterNode<TValue>> = {},
    private readonly paramChildren: Record<string, RouterNode<TValue>> = {},
    private wildcardChild?: RouterNode<TValue>,
    private childrenCount = 0,
  ) {
    [
      ...Object.values(staticChildren),
      ...Object.values(paramChildren),
      wildcardChild,
    ].forEach((child) => {
      if (child) {
        child.parent = this;
      }
    });

    this.sortChildren();
  }

  add(pathname: string, value: TValue): void {
    return this._add(pathname, value);
  }

  get(path: string): IFindResult<TValue> | undefined {
    const clearedPath = path === '/' ? path : path.endsWith('/') ? path.substring(0, path.length - 1) : path;

    return clearedPath === this.pathname && this.value !== undefined
      ? { value: this.value, params: {} }
      : clearedPath === this.pathname
      ? undefined
      : clearedPath.startsWith(this.pathname)
      ? this._get(clearedPath)
      : undefined;
  }

  private incrementChildrenCount(): void {
    this.childrenCount++;

    if (this.parent) {
      this.parent.sortChildren();
      this.parent.incrementChildrenCount();
    }
  }

  private sortChildren(): void {
    this.sortStaticChildren();
    this.sortParamChildren();
  }

  private sortStaticChildren(): void {
    this.sortedStaticChildren = Object.values(this.staticChildren).sort((
      a,
      b,
    ) => a.childrenCount - b.childrenCount);
  }

  private sortParamChildren(): void {
    this.sortedParamChildren = Object.values(this.paramChildren).sort((a, b) => a.childrenCount - b.childrenCount);
  }

  private addStaticChild(pathname: string, child: RouterNode<TValue>): void {
    const shouldIncrementChildCount = !this.staticChildren[pathname];

    child.parent = this;
    this.staticChildren[pathname] = child;

    this.sortStaticChildren();

    if (shouldIncrementChildCount) {
      this.incrementChildrenCount();
    }
  }

  private addParamChild(paramName: string, child: RouterNode<TValue>): void {
    const shouldIncrementChildCount = !this.paramChildren[paramName];

    child.parent = this;
    this.paramChildren[paramName] = child;

    this.sortParamChildren();

    if (shouldIncrementChildCount) {
      this.incrementChildrenCount();
    }
  }

  private setWildcardChild(child: RouterNode<TValue>): void {
    const shouldIncrementChildCount = !this.wildcardChild;

    child.parent = this;
    this.wildcardChild = child;

    if (shouldIncrementChildCount) {
      this.incrementChildrenCount();
    }
  }

  private matchStaticChildSubtree(pathname: string): MatchSubtreeResult {
    return Object.keys(this.staticChildren).reduce<MatchSubtreeResult>(
      (acc, childPath) => {
        const { common, tail1, tail2 } = getCommonSubstring(
          pathname,
          childPath,
        );
        return (common?.length ?? 0) > acc.common!.length ? { common, tail1, tail2, childPath } : acc;
      },
      { common: '', tail1: pathname, tail2: undefined, childPath: undefined },
    );
  }

  private _get(
    path: string,
    params: Record<string, string> = {},
  ): IFindResult<TValue> | undefined {
    const staticResult = this.sortedStaticChildren.find((child) => path.startsWith(child.pathname));
    if (staticResult?.pathname === path) {
      return staticResult.value !== undefined ? { value: staticResult.value, params } : undefined;
    }
    if (staticResult) {
      return staticResult._get(
        path.substring(staticResult.pathname.length),
        params,
      );
    }

    if (path[0] === '/') {
      const [paramValue, clearedPath] = splitStringToFirstOccurence(
        path.substring(1),
        '/',
      );
      if (!clearedPath) {
        const matchedParamChild = this.sortedParamChildren.find((child) => child.value !== undefined);
        if (matchedParamChild) {
          return {
            value: matchedParamChild.value!,
            params: {
              ...params,
              [matchedParamChild.pathname]: paramValue,
            },
          };
        }
      } else {
        const findInParamChildren = (
          idx = 0,
        ): IFindResult<TValue> | undefined => {
          if (idx === this.sortedParamChildren.length) {
            return undefined;
          }

          const child = this.sortedParamChildren[idx];
          const childParams = { ...params, [child.pathname]: paramValue };
          const childResult = child._get(clearedPath, childParams);

          return childResult ?? findInParamChildren(idx + 1);
        };

        const paramChildrenResult = findInParamChildren();
        if (paramChildrenResult) {
          return paramChildrenResult;
        }
      }
    }

    return this.wildcardChild?.value !== undefined ? { value: this.wildcardChild.value, params } : undefined;
  }

  private _add(pathname: string, value: TValue, trimPath = true): void {
    const path = trimPath ? pathname.substring(this.pathname.length) : pathname;

    const pathWithoutTrailingSlash = path === '/'
      ? path
      : path.endsWith('/')
      ? path.substring(0, path.length - 1)
      : path;

    const { head, paramName, tail } = splitByNextParam(
      pathWithoutTrailingSlash,
    );

    if (paramName) {
      return this.addWithParam(paramName, value, head, tail);
    }

    if (!head) {
      this.value = value;
      return;
    }

    const matchSubtreeResult = this.matchStaticChildSubtree(pathname);
    if (matchSubtreeResult.common && matchSubtreeResult.childPath) {
      const child = this.staticChildren[matchSubtreeResult.childPath];

      if (matchSubtreeResult.tail1 && !matchSubtreeResult.tail2) {
        return child._add(matchSubtreeResult.tail1, value, false);
      }

      const newSubtree = this.splitStaticChild(
        child,
        matchSubtreeResult.common.length,
      );
      if (matchSubtreeResult.tail1) {
        return newSubtree._add(matchSubtreeResult.tail1, value, false);
      }

      newSubtree.value = value;
      return;
    }

    if (head === WILDCARD_SIGN) {
      const newWildcardChild = new RouterNode<TValue>(WILDCARD_SIGN, value);
      return this.setWildcardChild(newWildcardChild);
    }

    if (head.endsWith(WILDCARD_SIGN)) {
      const clearedHead = head === `/${WILDCARD_SIGN}`
        ? '/'
        : head.endsWith(`/${WILDCARD_SIGN}`)
        ? head.substring(0, pathname.length - 2)
        : head.substring(0, pathname.length - 1);

      const newStaticChild = new RouterNode<TValue>(clearedHead);
      this.addStaticChild(clearedHead, newStaticChild);

      const newWildcardChild = new RouterNode<TValue>(WILDCARD_SIGN, value);
      newStaticChild.setWildcardChild(newWildcardChild);

      return;
    }

    const newStaticChild = new RouterNode<TValue>(head, value);
    this.addStaticChild(head, newStaticChild);
  }

  private addWithParam(
    paramName: string,
    value: TValue,
    pathname?: string,
    tail?: string,
  ): void {
    if (!pathname && tail) {
      const matchedSubtree = Object.entries(this.paramChildren).find((
        [childParamName],
      ) => childParamName === paramName);
      if (matchedSubtree) {
        return matchedSubtree[1]._add(tail, value, false);
      }
    }

    if (!pathname) {
      const child = new RouterNode<TValue>(paramName, tail ? undefined : value);
      this.addParamChild(paramName, child);

      if (tail) {
        child._add(tail, value, false);
      }

      return;
    }

    const matchSubtreeResult = this.matchStaticChildSubtree(pathname);
    if (matchSubtreeResult.common && matchSubtreeResult.childPath) {
      const child = this.staticChildren[matchSubtreeResult.childPath];

      if (!matchSubtreeResult.tail2) {
        return child.addWithParam(
          paramName,
          value,
          matchSubtreeResult.tail1,
          tail,
        );
      }

      const newSubtree = this.splitStaticChild(
        child,
        matchSubtreeResult.common.length,
      );
      return newSubtree.addWithParam(
        paramName,
        value,
        matchSubtreeResult.tail1,
        tail,
      );
    }

    const newStaticChild = new RouterNode<TValue>(pathname, undefined);
    this.addStaticChild(pathname, newStaticChild);

    newStaticChild.addWithParam(paramName, value, undefined, tail);
  }

  private splitStaticChild(
    child: RouterNode<TValue>,
    splitAt: number,
  ): RouterNode<TValue> {
    const parentPath = child.pathname.substring(0, splitAt);
    const childPath = child.pathname.substring(splitAt);

    delete this.staticChildren[child.pathname];

    const parent = new RouterNode<TValue>(
      parentPath,
      undefined,
      undefined,
      undefined,
      undefined,
      child.childrenCount,
    );

    const newChild = new RouterNode<TValue>(
      childPath,
      child.value,
      child.staticChildren,
      child.paramChildren,
      child.wildcardChild,
      child.childrenCount,
    );

    parent.addStaticChild(childPath, newChild);

    this.addStaticChild(parentPath, parent);

    return parent;
  }

  toJSON(): Partial<RouterNode<TValue>> {
    const { parent, ...instance } = this;
    return { ...instance, parent: parent?.pathname };
  }
}
