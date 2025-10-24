export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📺 全国IPTV直播流代理</h1>
      <p>基于Next.js + Edge Runtime的全国各地电视台直播代理服务 | EdgeOne Pages部署版本</p>
      
      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>🎬 4K超高清 (9个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>btv4k - 北京卫视4K</li>
            <li>sh4k - 上海卫视4K</li>
            <li>js4k - 江苏卫视4K</li>
            <li>sz4k - 深圳卫视4K</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/4k?id=btv4k</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 北京TV (10个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>bjws - 北京卫视</li>
            <li>bjws4k - 北京卫视4K</li>
            <li>bjwy - BRTV文艺</li>
            <li>bjjskj - BRTV纪实科教</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/beijing?id=bjws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 河南TV (17个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>hnws - 河南卫视</li>
            <li>hnds - 河南都市</li>
            <li>hnms - 河南民生</li>
            <li>hmfz - 河南法治</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/henan?id=hnws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 河北TV (8个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>hbws - 河北卫视</li>
            <li>hbjj - 经济生活</li>
            <li>hbds - 河北都市</li>
            <li>hbys - 河北影视剧</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/hebei?id=hbws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 江苏TV (10个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>jsws - 江苏卫视</li>
            <li>jsws4k - 江苏卫视4K</li>
            <li>jscs - 江苏城市</li>
            <li>jszy - 江苏综艺</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/jiangsu?id=jsws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 山东TV (26个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>sdws - 山东卫视</li>
            <li>xwpd - 新闻频道</li>
            <li>qlpd - 齐鲁频道</li>
            <li>jndst - 济南台</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/shandong?id=sdws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 陕西TV</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>1131 - 陕西卫视</li>
            <li>1127 - 新闻资讯</li>
            <li>2134 - 新闻广播</li>
            <li>... + 广播频道</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/shaanxi?id=1131</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 深圳TV (11个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>szws4k - 深圳卫视4K</li>
            <li>szws - 深圳卫视</li>
            <li>szds - 都市频道</li>
            <li>szdsj - 电视剧频道</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/shenzhen?id=szws</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 石家庄TV</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>石家庄电视台</li>
            <li>支持多个频道</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/sjz?id=4</code>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>📺 云南TV (6个)</h2>
          <ul style={{ fontSize: '14px' }}>
            <li>ynws - 云南卫视</li>
            <li>ynds - 云南都市</li>
            <li>ynyl - 云南娱乐</li>
            <li>yngg - 云南公共</li>
          </ul>
          <code style={{ fontSize: '12px', background: '#f4f4f4', padding: '5px' }}>/api/yunnan?id=ynws</code>
        </div>

      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h2>📖 使用说明</h2>
        <ol>
          <li><strong>直接播放</strong>: 复制API链接到VLC/PotPlayer等播放器</li>
          <li><strong>频道列表</strong>: 添加 <code>?id=list</code> 参数获取M3U8格式频道列表</li>
          <li><strong>生成播放列表</strong>:
            <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', margin: '10px 0', overflow: 'auto' }}>
{`curl https://your-domain.com/api/4k?id=list > 4k.m3u8
vlc 4k.m3u8`}
            </pre>
          </li>
        </ol>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
        <p><strong>⚠️ 注意事项</strong></p>
        <ul>
          <li>仅供学习交流使用,请遵守相关法律法规</li>
          <li>部分频道可能因版权限制无法播放</li>
          <li>建议在EdgeOne Pages免费额度内使用</li>
        </ul>
      </div>

      <footer style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #ddd', textAlign: 'center', color: '#666' }}>
        <p>Powered by Next.js 14 + Edge Runtime | Deployed on EdgeOne Pages</p>
        <p><a href="https://github.com/vitter/iptv-edgeone" target="_blank" style={{ color: '#0070f3' }}>GitHub 仓库</a> | <a href="README.md" style={{ color: '#0070f3' }}>查看文档</a></p>
      </footer>
    </div>
  );
}
