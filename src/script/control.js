import * as alphaTab from 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.mjs';
import { loadSidebarScores } from './sidebar-loader.js';

// 添加FOUC防护函数
function preventFOUC() {
    // 页面完全加载后才显示内容
    window.addEventListener('load', () => {
        document.body.classList.add('content-loaded');
        document.querySelector('.app-container').style.visibility = 'visible';
    });

    // 如果资源加载太慢，最多等待2秒后也要显示内容
    setTimeout(() => {
        document.body.classList.add('content-loaded');
        document.querySelector('.app-container').style.visibility = 'visible';
    }, 2000);
}

// 页面初始加载时就执行FOUC防护
preventFOUC();

const toDomElement = (function () {
    const parser = document.createElement('div');
    return function (html) {
        parser.innerHTML = html;
        return parser.firstElementChild;
    };
})();

function createTrackItem(track) {
    const trackTemplate = Handlebars.compile(document.querySelector('#at-track-template').innerHTML);
    const trackItem = toDomElement(trackTemplate(track));

    // init track controls
    const muteButton = trackItem.querySelector('.at-track-mute');
    const soloButton = trackItem.querySelector('.at-track-solo');
    const volumeSlider = trackItem.querySelector('.at-track-volume');

    muteButton.onclick = function (e) {
        e.stopPropagation();
        muteButton.classList.toggle('active');
        at.changeTrackMute([track], muteButton.classList.contains('active'));
    };

    soloButton.onclick = function (e) {
        e.stopPropagation();
        soloButton.classList.toggle('active');
        at.changeTrackSolo([track], soloButton.classList.contains('active'));
    };

    volumeSlider.oninput = function (e) {
        e.preventDefault();
        // Here we need to do some math to map the 1-16 slider to the
        // volume in alphaTab. In alphaTab it is 1.0 for 100% which is
        // equal to the volume in the track information
        at.changeTrackVolume([track], volumeSlider.value / track.playbackInfo.volume);
    };

    volumeSlider.onclick = function (e) {
        e.stopPropagation();
    };

    trackItem.onclick = function (e) {
        e.stopPropagation();
        at.renderTracks([track]);
    };

    muteButton.value = track.playbackInfo.isMute;
    soloButton.value = track.playbackInfo.isSolo;
    volumeSlider.value = track.playbackInfo.volume;

    trackItem.track = track;
    return trackItem;
}

function setupControl(selector) {
    const el = document.querySelector(selector);
    const control = el.closest('.at-wrap');
    
    // 初始化曲谱列表
    const scoreList = document.querySelector('.app-sidebar .score-items');
    if (scoreList) {
        // 使用独立的模块加载边栏曲谱列表，仅在播放器页面执行此逻辑
        loadSidebarScores(scoreList, async (score) => {
            try {
                console.log('开始加载曲谱:', score.file);
                // 修复路径
                const response = await fetch(`assets/scores/${score.file}`); // 移除多余的 "../"
                if (!response.ok) {
                    throw new Error(`文件加载失败: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                console.log('曲谱文件已加载，开始解析');
                at.load(arrayBuffer, [0]).catch(e => {
                    console.error('曲谱解析失败:', e);
                    alert('曲谱格式不支持或已损坏');
                });
            } catch (error) {
                console.error('加载曲谱出错:', error);
                // alert(`无法加载曲谱: ${error.message}`);
            }
        });
    }

    const viewPort = control.querySelector('.at-viewport');
    const at = new alphaTab.AlphaTabApi(el, {
        // file: 'https://www.alphatab.net/files/canon.gp',
        file: 'assets/scores/吉他与孤独与蓝色星球.gpx',
        player: {
            enablePlayer: true,
            soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@alpha/dist/soundfont/sonivox.sf2',
            scrollElement: viewPort,
            scrollOffsetX: -10,
            scrollMode: alphaTab.ScrollMode.Continuous, // 明确设置滚动模式
            scrollSpeed: 300 // 控制滚动速度
        }
    });

    // 添加调试输出
    // console.log('AlphaTab初始化完成，滚动模式:', at.settings.player.scrollMode);

    at.error.on(function(e) {
        console.error('alphaTab error', e);
    });

    el.ondragover = function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
    };

    el.ondrop = function (e) {
        e.stopPropagation();
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length === 1) {
            const reader = new FileReader();
            reader.onload = function (data) {
                at.load(data.target.result, [0]);
            };
            reader.readAsArrayBuffer(files[0]);
        }
        console.log('drop', files);
    };

    const trackItems = [];
    at.renderStarted.on(function (isResize) {
        if (!isResize) {
            control.classList.add('loading');
        }
        const tracks = new Map();
        at.tracks.forEach(function (t) {
            tracks.set(t.index, t);
        });

        trackItems.forEach(function (trackItem) {
            if (tracks.has(trackItem.track.index)) {
                trackItem.classList.add('active');
            } else {
                trackItem.classList.remove('active');
            }
        });
    });

    const playerLoadingIndicator = control.querySelector('.at-player-loading');
    at.soundFontLoad.on(function (args) {
        updateProgress(playerLoadingIndicator, args.loaded / args.total);
    });
    at.soundFontLoaded.on(function () {
        playerLoadingIndicator.classList.add('d-none');
    });
    at.renderFinished.on(function () {
        control.classList.remove('loading');
        control.style.visibility = 'visible';
        // 确保主容器在渲染完成后可见
        document.body.classList.add('content-loaded');
        document.querySelector('.app-container').style.visibility = 'visible';
    });

    // 添加错误处理
    at.error.on(function(e) {
        console.error('AlphaTab error:', e);
        control.style.visibility = 'visible';
        control.classList.remove('loading');
        // 即使出错也确保页面可见
        document.body.classList.add('content-loaded');
        document.querySelector('.app-container').style.visibility = 'visible';
    });

    at.scoreLoaded.on(function (score) {
        control.querySelector('.at-song-title').innerText = score.title;
        control.querySelector('.at-song-artist').innerText = score.artist;

        // fill track selector
        const trackList = control.querySelector('.at-track-list');
        trackList.innerHTML = '';

        score.tracks.forEach(function (track) {
            const trackItem = createTrackItem(track);
            trackItems.push(trackItem);
            trackList.appendChild(trackItem);
        });

        currentTempo = score.tempo;
    });

    let currentTempo = 0;
    const timePositionLabel = control.querySelector('.at-time-position');
    const timeSliderValue = control.querySelector('.at-time-slider-value');

    function formatDuration(milliseconds) {
        let seconds = milliseconds / 1000;
        const minutes = (seconds / 60) | 0;
        seconds = (seconds - minutes * 60) | 0;
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    let previousTime = -1;
    at.playerPositionChanged.on(function (args) {
        // reduce number of UI updates to second changes.
        const currentSeconds = (args.currentTime / 1000) | 0;
        if (currentSeconds == previousTime) {
            return;
        }
        previousTime = currentSeconds;

        timePositionLabel.innerText = formatDuration(args.currentTime) + ' / ' + formatDuration(args.endTime);
        timeSliderValue.style.width = ((args.currentTime / args.endTime) * 100).toFixed(2) + '%';
    });

    // 添加调试代码监控滚动行为
    at.playerPositionChanged.on(function (args) {
        // console.log('播放位置:', args.currentTime.toFixed(2), 
        //             '当前小节索引:', args.beat ? args.beat.index : 'unknown',
        //             '自动滚动模式:', at.settings.player.scrollMode);
    });

    // 添加调试代码监控视图对象
    // console.log('滚动容器:', viewPort);
    // console.log('滚动设置:', {
    //     scrollMode: at.settings.player.scrollMode,
    //     scrollSpeed: at.settings.player.scrollSpeed,
    //     scrollOffsetX: at.settings.player.scrollOffsetX,
    //     scrollOffsetY: at.settings.player.scrollOffsetY,
    //     layoutMode: at.settings.display.layoutMode
    // });

    const playPauseButton = control.querySelector('.at-play-pause');
    at.playerReady.on(function () {
        control.querySelectorAll('.at-player .disabled').forEach(function (c) {
            c.classList.remove('disabled');
        });
    });

    at.playerStateChanged.on(function (args) {
        const icon = playPauseButton.querySelector('i');
        // console.log('播放状态改变:', args.state, '图标元素:', icon);
        
        if (!icon) {
            // console.error('播放图标元素不存在，这会影响滚动功能');
            return; // 防止在null上调用方法
        }
        
        if (args.state == 0) {
            // 使用data-lucide属性替换图标
            icon.setAttribute('data-lucide', 'play');
            lucide.replace(); // 刷新图标
            // console.log('播放状态: 停止');
        } else {
            // 使用data-lucide属性替换图标
            icon.setAttribute('data-lucide', 'pause');
            lucide.replace(); // 刷新图标
            // console.log('播放状态: 播放');
        }
    });

    playPauseButton.onclick = function (e) {
        e.stopPropagation();
        if (!e.target.classList.contains('disabled')) {
            at.playPause();
        }
    };

    control.querySelector('.at-stop').onclick = function (e) {
        e.stopPropagation();
        if (!e.target.classList.contains('disabled')) {
            at.stop();
        }
    };

    control.querySelector('.at-metronome').onclick = function (e) {
        e.stopPropagation();
        const link = e.target.closest('a');
        link.classList.toggle('active');
        if (link.classList.contains('active')) {
            at.metronomeVolume = 1;
        } else {
            at.metronomeVolume = 0;
        }
    };

    control.querySelector('.at-count-in').onclick = function (e) {
        e.stopPropagation();
        const link = e.target.closest('a');
        link.classList.toggle('active');
        if (link.classList.contains('active')) {
            at.countInVolume = 1;
        } else {
            at.countInVolume = 0;
        }
    };

    control.querySelectorAll('.at-speed-options a').forEach(function (a) {
        a.onclick = function (e) {
            e.preventDefault();
            at.playbackSpeed = parseFloat(e.target.innerText);
            control.querySelector('.at-speed-label').innerText = e.target.innerText;
        };
    });

    control.querySelector('.at-loop').onclick = function (e) {
        e.stopPropagation();
        const link = e.target.closest('a');
        link.classList.toggle('active');
        if (link.classList.contains('active')) {
            at.isLooping = true;
        } else {
            at.isLooping = false;
        }
    };

    control.querySelector('.at-print').onclick = function (e) {
        at.print();
    };

    control.querySelector('.at-download').onclick = function (e) {
        const exporter = new alphaTab.exporter.Gp7Exporter();
        const data = exporter.export(at.score, at.settings);
        const a = document.createElement('a');
        a.download = at.score.title.length > 0 ? at.score.title + '.gp' : 'song.gp';
        a.href = URL.createObjectURL(new Blob([data]));
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    control.querySelectorAll('.at-zoom-options a').forEach(function (a) {
        a.onclick = function (e) {
            e.preventDefault();
            at.settings.display.scale = parseInt(e.target.innerText) / 100.0;
            control.querySelector('.at-zoom-label').innerText = e.target.innerText;
            at.updateSettings();
            at.render();
        };
    });

    control.querySelectorAll('.at-layout-options a').forEach(function (a) {
        a.onclick = function (e) {
            e.preventDefault();
            const settings = at.settings;
            console.log('切换布局模式:', e.target.dataset.layout);
            
            switch (e.target.dataset.layout) {
                case 'page':
                    settings.display.layoutMode = alphaTab.LayoutMode.Page;
                    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                    console.log('设置为垂直布局，滚动模式:', settings.player.scrollMode);
                    break;
                case 'horizontal-bar':
                    settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                    console.log('设置为水平条形布局，滚动模式:', settings.player.scrollMode);
                    break;
                case 'horizontal-screen':
                    settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                    settings.player.scrollMode = alphaTab.ScrollMode.OffScreen;
                    console.log('设置为水平屏幕布局，滚动模式:', settings.player.scrollMode);
                    break;
            }

            at.updateSettings();
            at.render();
        };
    });

    $(control).find('[data-toggle="tooltip"]').tooltip();

    return at;
}

function updateProgress(el, value) {
    value = value * 100;
    const left = el.querySelector('.progress-left .progress-bar');
    const right = el.querySelector('.progress-right .progress-bar');
    function percentageToDegrees(percentage) {
        return (percentage / 100) * 360;
    }

    if (value > 0) {
        if (value <= 50) {
            right.style.transform = 'rotate(' + percentageToDegrees(value) + 'deg)';
        } else {
            right.style.transform = 'rotate(180deg)';
            left.style.transform = 'rotate(' + percentageToDegrees(value - 50) + 'deg)';
        }
    }
    el.querySelector('.progress-value-number').innerText = value | 0;
}

// 初始化alphaTab控件
document.addEventListener('DOMContentLoaded', () => {
    console.log('执行setupControl入口');
    const at = setupControl('#alphaTab');
});

// 导出setupControl函数
export { setupControl };
