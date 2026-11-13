        const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        
        let selectedRouletteChip = 10;
        let rouletteBets = {};
        let rInSpin = false;
        let wheelAngle = 0;
        let rFastSpin = false;
        let rBall = null;      // 스핀 중 공의 위치 { angle, r }
        let rWinIdx = null;    // 마지막 결과 칸. 공이 그 칸에 놓이고 강조된다.
        const R_TAU = Math.PI * 2;

        function initRouletteBoard() {
            const grid = document.getElementById('roulette-numbers-grid');
            grid.innerHTML = '';
            for (let i = 1; i <= 36; i++) {
                const isRed = redNumbers.includes(i);
                const bg = isRed ? 'bg-red-700 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-800';
                grid.innerHTML += `
                    <div onclick="placeRouletteBet('${i}')" class="${bg} text-white rounded py-2 cursor-pointer transition relative border border-white/5">
                        ${i}
                        <span id="r-bet-${i}" class="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full w-4 h-4 text-[9px] font-black hidden items-center justify-center"></span>
                    </div>
                `;
            }
        }

        function selectRouletteChip(amt) {
            selectedRouletteChip = amt;
            playSound('chip');
        }

        function placeRouletteBet(key) {
            if (rInSpin) return;
            if (balance < selectedRouletteChip) {
                document.getElementById('roulette-status').innerText = "잔액이 부족합니다!";
                return;
            }
            balance -= selectedRouletteChip;
            rouletteBets[key] = (rouletteBets[key] || 0) + selectedRouletteChip;

            if (balance === 0) {
                triggerAllInEffect();
            } else {
                playSound('chip');
            }

            updateGlobalBalanceUI();
            updateRouletteBetsUI();
        }

        function clearRouletteBets() {
            if (rInSpin) return;
            let total = 0;
            Object.values(rouletteBets).forEach(v => total += v);
            balance += total;
            rouletteBets = {};
            updateGlobalBalanceUI();
            updateRouletteBetsUI();
            playSound('chip');
        }

        function updateRouletteBetsUI() {
            let total = 0;
            document.querySelectorAll('[id^="r-bet-"]').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); });
            
            Object.keys(rouletteBets).forEach(k => {
                const amt = rouletteBets[k];
                total += amt;
                const badge = document.getElementById(`r-bet-${k}`);
                if (badge && amt > 0) {
                    badge.innerText = amt >= 1000 ? `${amt/1000}k` : amt;
                    badge.classList.remove('hidden');
                    badge.classList.add('flex');
                }
            });
            document.getElementById('r-total-bet').innerText = `$${total.toLocaleString()}`;
        }

        function toggleRouletteFast() {
            rFastSpin = !rFastSpin;
            document.getElementById('btn-roulette-fast').innerText = `빠르게 보기: ${rFastSpin ? '켬' : '끔'}`;
        }

        // 바깥쪽 공 트랙과 안쪽 휠의 반지름. 공은 트랙을 돌다가 포켓 반지름으로 내려앉는다.
        function rouletteGeometry(canvas) {
            const cx = canvas.width / 2;
            const R = cx - 3;
            const wheelR = R * 0.78;
            return { cx, cy: canvas.height / 2, R, wheelR, trackR: R * 0.89, pocketR: wheelR - 9 };
        }

        function drawRouletteBall(ctx, g, angle, r) {
            const x = g.cx + Math.cos(angle) * r;
            const y = g.cy + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.arc(x + 1.5, y + 2.5, 5, 0, R_TAU);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();
            const grad = ctx.createRadialGradient(x - 1.8, y - 1.8, 0.5, x, y, 5.5);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#94a3b8');
            ctx.beginPath();
            ctx.arc(x, y, 5.5, 0, R_TAU);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        function drawRouletteWheel() {
            const canvas = document.getElementById('roulette-wheel');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const g = rouletteGeometry(canvas);
            const { cx, cy, R, wheelR, pocketR } = g;
            const slice = R_TAU / rouletteNumbers.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 공 트랙
            const track = ctx.createRadialGradient(cx, cy, wheelR, cx, cy, R);
            track.addColorStop(0, '#1c1209');
            track.addColorStop(1, '#4a3520');
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, R_TAU);
            ctx.fillStyle = track;
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();

            rouletteNumbers.forEach((num, i) => {
                const angle = wheelAngle + i * slice;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, wheelR, angle, angle + slice);
                ctx.closePath();

                if (num === 0) ctx.fillStyle = '#047857';
                else if (redNumbers.includes(num)) ctx.fillStyle = '#b91c1c';
                else ctx.fillStyle = '#0f172a';
                ctx.fill();
                ctx.strokeStyle = '#d9a441';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle + slice / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText(num, wheelR - 22, 4);
                ctx.restore();
            });

            // 결과 칸 강조
            if (rWinIdx !== null && !rBall) {
                const a = wheelAngle + rWinIdx * slice;
                ctx.beginPath();
                ctx.arc(cx, cy, wheelR - 1, a, a + slice);
                ctx.arc(cx, cy, wheelR - 30, a + slice, a, true);
                ctx.closePath();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(cx, cy, 32, 0, R_TAU);
            ctx.fillStyle = '#d97706';
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.stroke();

            if (rBall) drawRouletteBall(ctx, g, rBall.angle, rBall.r);
            else if (rWinIdx !== null) drawRouletteBall(ctx, g, wheelAngle + rWinIdx * slice + slice / 2, pocketR);
        }

        function rSmooth(a, b, x) {
            const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
        }

        // 진행도 p(0~1)에서 공의 위치. slotAngle은 그 순간 당첨 칸의 중심 각도이고,
        // 마지막에 relative가 0이 되므로 공은 항상 미리 정한 칸에 들어간다.
        function rouletteBallPose(p, slotAngle, g) {
            let relative = R_TAU * 14 * Math.pow(1 - p, 2);            // 휠 기준으로 느려지는 공 회전
            let r = g.trackR + (g.pocketR - g.trackR) * rSmooth(0.52, 0.78, p);  // 트랙에서 포켓으로 가라앉음
            if (p > 0.74) {
                const u = (p - 0.74) / 0.26;                            // 포켓 칸막이에 튕기는 구간
                r += 16 * Math.pow(1 - u, 2) * Math.abs(Math.sin(3.2 * Math.PI * u));
                relative += 0.1 * Math.pow(1 - u, 2) * Math.sin(5 * Math.PI * u);
            }
            return { angle: slotAngle + relative, r };
        }

        function spinRoulette() {
            if (rInSpin) return;
            let totalBet = 0;
            Object.values(rouletteBets).forEach(v => totalBet += v);
            if (totalBet <= 0) {
                document.getElementById('roulette-status').innerText = "베팅을 먼저 진행하세요!";
                return;
            }

            rInSpin = true;
            document.getElementById('btn-spin-roulette').disabled = true;
            document.getElementById('roulette-status').innerText = "휠이 회전하는 중입니다...";

            const winIndex = Math.floor(Math.random() * rouletteNumbers.length);
            const winningNum = rouletteNumbers[winIndex];
            const slice = (Math.PI * 2) / rouletteNumbers.length;
            
            const targetAngle = (Math.PI * 3 / 2) - (winIndex * slice) - (slice / 2);
            // 이전 각도에서 이어서 돌아 끝에는 당첨 칸이 위쪽 화살표 아래에 온다.
            const baseAngle = wheelAngle;
            const totalRotation = (((targetAngle - baseAngle) % R_TAU) + R_TAU) % R_TAU + R_TAU * 6;
            const slotOffset = winIndex * slice + slice / 2;
            const geo = rouletteGeometry(document.getElementById('roulette-wheel'));

            let startTime = null;
            const duration = rFastSpin ? 3000 : 6500;
            let lastSlot = -1;
            let lastTick = 0;
            rWinIdx = null;

            function animateSpin(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min(1, (timestamp - startTime) / duration);
                if (progress < 1) {
                    wheelAngle = baseAngle + totalRotation * (1 - Math.pow(1 - progress, 3));
                    rBall = rouletteBallPose(progress, wheelAngle + slotOffset, geo);
                    drawRouletteWheel();
                    if (progress < 0.7) {
                        if (Math.random() < 0.15) playSound('spin');
                    } else {
                        // 공이 포켓 칸막이를 넘을 때마다 딸깍 소리를 낸다.
                        const slot = Math.floor((((rBall.angle - wheelAngle) % R_TAU) + R_TAU) % R_TAU / slice);
                        if (slot !== lastSlot && timestamp - lastTick > 35) { playSound('tick'); lastTick = timestamp; }
                        lastSlot = slot;
                    }
                    requestAnimationFrame(animateSpin);
                } else {
                    wheelAngle = baseAngle + totalRotation;
                    rBall = null;
                    rWinIdx = winIndex;
                    drawRouletteWheel();
                    playSound('tick');
                    settleRoulette(winningNum);
                }
            }
            requestAnimationFrame(animateSpin);
        }

        function settleRoulette(winningNum) {
            rInSpin = false;
            document.getElementById('btn-spin-roulette').disabled = false;
            const isRed = redNumbers.includes(winningNum);
            const colorText = winningNum === 0 ? 'GREEN' : isRed ? 'RED' : 'BLACK';
            document.getElementById('roulette-result-display').innerText = `당첨 번호: ${winningNum} (${colorText})`;

            let totalPayout = 0;
            const totalBet = Object.values(rouletteBets).reduce((sum, amount) => sum + amount, 0);
            Object.keys(rouletteBets).forEach(key => {
                const betAmt = rouletteBets[key];
                if (key === winningNum.toString()) totalPayout += betAmt * 36;
                else if (key === 'RED' && isRed) totalPayout += betAmt * 2;
                else if (key === 'BLACK' && !isRed && winningNum !== 0) totalPayout += betAmt * 2;
                else if (key === 'EVEN' && winningNum !== 0 && winningNum % 2 === 0) totalPayout += betAmt * 2;
                else if (key === 'ODD' && winningNum % 2 !== 0) totalPayout += betAmt * 2;
                else if (key === '1-18' && winningNum >= 1 && winningNum <= 18) totalPayout += betAmt * 2;
                else if (key === '19-36' && winningNum >= 19 && winningNum <= 36) totalPayout += betAmt * 2;
                else if (key === '1st12' && winningNum >= 1 && winningNum <= 12) totalPayout += betAmt * 3;
                else if (key === '2nd12' && winningNum >= 13 && winningNum <= 24) totalPayout += betAmt * 3;
                else if (key === '3rd12' && winningNum >= 25 && winningNum <= 36) totalPayout += betAmt * 3;
            });

            if (totalPayout > 0) {
                balance += totalPayout;
                lifetimeProfit += Math.max(0, totalPayout - totalBet);
                document.getElementById('roulette-status').innerText = `🎉 당첨! $${totalPayout.toLocaleString()} 획득!`;
                playSound('win');
            } else {
                document.getElementById('roulette-status').innerText = "아쉽게도 낙첨되었습니다.";
                playSound('lose');
            }

            rouletteBets = {};
            updateGlobalBalanceUI();
            updateRouletteBetsUI();
            checkBankruptOrEnding();
        }