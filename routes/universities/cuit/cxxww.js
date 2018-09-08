const axios = require('../../../utils/axios');
const cheerio = require('cheerio');
const resolve_url = require('url').resolve;

const host = 'http://www.cuit.edu.cn/';

const map = {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
};

module.exports = async (ctx) => {
    const type = ctx.params.type || '1';
    const link = host + 'NewsList?id=' + map[type];

    const response = await axios({
        method: 'get',
        url: link,
        headers: {
            Referer: host,
        },
    });

    const $ = cheerio.load(response.data);

    ctx.state.data = {
        link: link,
        title: $('#NewsTypeName').text(),
        item: $('.news1-links-ul>li')
            .map((_, elem) => ({
                link: resolve_url(link, $('a', elem).attr('href')),
                title: $('a', elem).text(),
                pubDate: new Date(
                    $('.datetime', elem)
                        .text()
                        .replace('[', '')
                        .replace(']', '')
                ).toUTCString(),
                description: ' '
            }))
            .get(),
    };
};
