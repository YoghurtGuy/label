export interface Response {
    /**
     * 状态码
     */
    code: number;
    data: unknown;
    /**
     * 信息
     */
    message: string;
}
export interface getResponse {
    /**
     * 是否是文件夹
     */
    is_dir: boolean;
    /**
     * 修改时间
     */
    modified: string;
    /**
     * 文件名
     */
    name: string;
    provider: string;
    /**
     * 原始url
     */
    raw_url: string;
    /**
     * 说明
     */
    readme: string;
    related: null;
    /**
     * 签名
     */
    sign: string;
    /**
     * 大小
     */
    size: number;
    /**
     * 缩略图
     */
    thumb: string;
    /**
     * 类型
     */
    type: number;
}

export interface listResponse {
    /**
     * 内容
     */
    content: listContent[];
    provider: string;
    /**
     * 说明
     */
    readme: string;
    /**
     * 总数
     */
    total: number;
    /**
     * 是否可写入
     */
    write: boolean;
}

export interface listContent {
    /**
     * 是否是文件夹
     */
    is_dir: boolean;
    /**
     * 修改时间
     */
    modified: string;
    /**
     * 文件名
     */
    name: string;
    /**
     * 签名
     */
    sign: string;
    /**
     * 大小
     */
    size: number;
    /**
     * 缩略图
     */
    thumb: string;
    /**
     * 类型
     */
    type: number;
}