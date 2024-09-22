import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import cache from '@/utils/cache';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/threads/:type',
    categories: ['bbs'],
    example: '/deepin/threads/latest',
    parameters: {
        type: {
            description: '主题类型',
            options: [
                {
                    value: 'hot',
                    label: '最热主题',
                },
                {
                    value: 'latest',
                    label: '最新主题',
                },
            ],
        },
    },
    name: '首页主题列表',
    maintainers: ['wurongjie@deepin.org'],
    radar: [
        {
            source: ['bbs.deepin.org'],
            target: '/threads/latest',
        },
    ],
    handler,
};

interface ThreadIndexResult {
    ThreadIndex: {
        id: number;
        subject: string;
        created_at: string;
        user: { nickname: string };
        forum: { name: string };
    }[];
}
interface ThreadInfoResult {
    data: {
        id: number;
        subject: string;
        created_at: string;
        user: { nickname: string };
        post: { message: string };
    };
}

async function handler(ctx) {
    const type = ctx.req.param('type') === 'hot' ? 'hot_value' : 'id';
    const res = await ofetch<ThreadIndexResult>(`https://bbs.deepin.org.cn/api/v1/thread/index`, {
        query: {
            languages: 'zh_CN',
            order: 'updated_at',
            where: type,
        },
        headers: {
            accept: 'application/json',
        },
    });
    const items = res.ThreadIndex.map((item) => ({
        id: String(item.id),
        title: item.subject,
        link: `https://bbs.deepin.org.cn/post/${item.id}`,
        pubDate: parseDate(item.created_at),
        author: item.user.nickname,
        category: [item.forum.name],
        description: '',
    }));
    await Promise.all(
        items.map(async (item) => {
            const message = await cache.tryGet(item.link, async () => {
                const resp = await ofetch<ThreadInfoResult>('https://bbs.deepin.org.cn/api/v1/thread/info?id=' + item.id);
                return { description: resp.data.post.message };
            });
            if (message) {
                item.description = message.description;
            }
        })
    );
    return {
        title: `deepin论坛主页`,
        link: `https://bbs.deepin.org`,
        item: items,
    };
}
