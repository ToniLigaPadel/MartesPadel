document.addEventListener('DOMContentLoaded', () => {
	// --- CÓDIGO ACTUALIZADO PARA DETECTAR iOS Y GESTIONAR EL VIDEO ---
    const video = document.getElementById('intro-video');
    const videoOverlay = document.getElementById('intro-video-overlay');
    const playButton = document.getElementById('play-button');

    if (video && videoOverlay) {
		// Ocultamos el botón 
		playButton.style.display = 'none';
		
        // Agregamos un evento para ocultar el overlay cuando el video termine.
        video.addEventListener('ended', () => {
            videoOverlay.classList.add('hidden');
        });
        
        // También nos aseguramos de que el video se silencie antes de reproducirse.
        video.muted = true;	
		
		video.play().catch(error => {
			console.error('La reproducción automática falló:', error);
			// Ocultamos el overlay y cargamos la web aunque haya error
			videoOverlay.classList.add('hidden'); 
		});
    }
	
    if (typeof appData === 'undefined') {
        console.error('Los datos del backend no se han cargado (appData no está definido).');
        return;
    }

    const players = appData.jugadores;
    const matches = appData.partidos;
    const sets = appData.sets;
    const results = appData.resultados;
    const couples = appData.parejas;
    const match_couples = appData.partido_pareja;

    // Almacena los colores asignados a cada jugador para consistencia
    const playerColors = {};

    const getRandomColor = (playerName) => {
        if (playerColors[playerName]) {
            return playerColors[playerName];
        }
        
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        
        playerColors[playerName] = color;
        return color;
    };

    const tabs = document.querySelectorAll('.tab-button');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                if (pane.id === targetId) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });

            if (targetId === 'ranking') {
                renderRanking();
            } else if (targetId === 'player') {
                renderPlayerProfile();
            } else if (targetId === 'metrics') {
                renderMetrics();
            } else if (targetId === 'history') {
                renderHistory();
            }
        });
    });
    
    const calculatePlayerPoints = (playerId, matchId) => {
        const matchResult = results.find(r => r.id_partido === matchId);
        if (!matchResult || matchResult.equipo_ganador === -1) {
            return 0;
        }

        const matchSets = sets.filter(s => s.id_partido === matchId);
        const playerMatchCouple = match_couples.find(mp => {
            const pair = couples.find(p => p.id_pareja === mp.id_pareja);
            return pair && (pair.id_jugador1 === playerId || pair.id_jugador2 === playerId) && mp.id_partido === matchId;
        });

        if (!playerMatchCouple) return 0;

        const playerTeam = playerMatchCouple.equipo;
        const isWinner = matchResult.equipo_ganador === playerTeam;
        const isTie = matchResult.equipo_ganador === 0;

        if (isWinner) {
            return 20;
        } else if (isTie) {
            let totalGamesWon = 0;
            matchSets.forEach(s => {
                if (playerTeam === 1) totalGamesWon += s.juegos_equipo1;
                else totalGamesWon += s.juegos_equipo2;
            });
            return totalGamesWon;
        } else {
            let totalGamesWon = 0;
            matchSets.forEach(s => {
                if (playerTeam === 1) totalGamesWon += s.juegos_equipo1;
                else totalGamesWon += s.juegos_equipo2;
            });
            return totalGamesWon;
        }
    };

    const getPlayerStats = () => {
        const playerStatsMap = new Map();

        players.forEach(player => {
            playerStatsMap.set(player.id_jugador, {
                ...player,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                totalPoints: 0,
                pointsPerMatch: 0,
                currentWinStreak: 0,
                maxWinStreak: 0,
                currentLossStreak: 0,
                maxLossStreak: 0,
                setsWon: 0,
                setsLost: 0,
                gamesWon: 0,
                gamesLost: 0,
                matchHistory: []
            });
        });

        const playedMatches = matches.filter(match => {
            const matchResult = results.find(r => r.id_partido === match.id_partido);
            return matchResult && matchResult.equipo_ganador !== -1;
        }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        playedMatches.forEach(match => {
            const matchCouples = match_couples.filter(mp => mp.id_partido === match.id_partido);
            const matchResult = results.find(r => r.id_partido === match.id_partido);

            matchCouples.forEach(mp => {
                const couple = couples.find(p => p.id_pareja === mp.id_pareja);
                const playersInCouple = [couple.id_jugador1, couple.id_jugador2];

                playersInCouple.forEach(playerId => {
                    const stats = playerStatsMap.get(playerId);
                    if (!stats) return;

                    stats.matchesPlayed++;
                    const points = calculatePlayerPoints(playerId, match.id_partido);
                    stats.totalPoints += points;
                    
                    if (matchResult.equipo_ganador === mp.equipo) {
                        stats.wins++;
                        stats.currentWinStreak++;
                        stats.currentLossStreak = 0;
                    } else if (matchResult.equipo_ganador === 0) {
                        stats.ties++;
                        stats.currentWinStreak = 0;
                        stats.currentLossStreak = 0;
                    } else {
                        stats.losses++;
                        stats.currentLossStreak++;
                        stats.currentWinStreak = 0;
                    }

                    if (stats.currentWinStreak > stats.maxWinStreak) {
                        stats.maxWinStreak = stats.currentWinStreak;
                    }
                    if (stats.currentLossStreak > stats.maxLossStreak) {
                        stats.maxLossStreak = stats.currentLossStreak;
                    }

                    const matchSets = sets.filter(s => s.id_partido === match.id_partido);
                    matchSets.forEach(s => {
                        if (mp.equipo === 1) {
                            if (s.juegos_equipo1 > s.juegos_equipo2) stats.setsWon++; else stats.setsLost++;
                            stats.gamesWon += s.juegos_equipo1;
                            stats.gamesLost += s.juegos_equipo2;
                        } else {
                            if (s.juegos_equipo2 > s.juegos_equipo1) stats.setsWon++; else stats.setsLost++;
                            stats.gamesWon += s.juegos_equipo2;
                            stats.gamesLost += s.juegos_equipo1;
                        }
                    });
                });
            });
        });

        const finalStats = Array.from(playerStatsMap.values()).map(stats => ({
            ...stats,
            pointsPerMatch: stats.matchesPlayed > 0 ? (stats.totalPoints / stats.matchesPlayed) : 0
        }));

        return finalStats;
    };

    const playersStats = getPlayerStats();

    const renderRanking = () => {
        const sortedPlayers = [...playersStats].sort((a, b) => {
			const avgA = a.matchesPlayed > 0 ? a.totalPoints / a.matchesPlayed : 0;
			const avgB = b.matchesPlayed > 0 ? b.totalPoints / b.matchesPlayed : 0;
			return avgB - avgA;
		});
        const container = document.getElementById('ranking-container');
		let lastPointsPerMatch = null;
		let currentPosition = 0;

        const tableContent = sortedPlayers.map((player, index) => {
            const playerPointsPerMatch = player.matchesPlayed > 0 ? player.totalPoints / player.matchesPlayed : 0;

			if (index === 0 || playerPointsPerMatch < lastPointsPerMatch) {
				currentPosition++;
			}
			lastPointsPerMatch = playerPointsPerMatch;

			let medal = '';
			if (currentPosition === 1) {
				medal = '🥇';
			} else if (currentPosition === 2) {
				medal = '🥈';
			} else if (currentPosition === 3) {
				medal = '🥉';
			}
			
			return `
				<tr>
					<td data-label="Posición">${currentPosition} ${medal}</td>
					<td data-label="Nombre">${player.nombre}</td>
					<td data-label="Puntos por Partido">${player.pointsPerMatch.toFixed(2)}</td>
					<td data-label="Puntos Totales">${player.totalPoints}</td>
					<td data-label="Partidos Jugados">${player.matchesPlayed}</td>
					<td data-label="Ganados">${player.wins}</td>
					<td data-label="Empatados">${player.ties}</td>
					<td data-label="Perdidos">${player.losses}</td>
				</tr>
			`;
		}).join('');

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Nombre</th>
                        <th>Puntos por Partido</th>
                        <th>Puntos Totales</th>
                        <th>Partidos Jugados</th>
                        <th>Ganados</th>
                        <th>Empatados</th>
                        <th>Perdidos</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableContent}
                </tbody>
            </table>
        `;
    };

    const playerSelect = document.getElementById('player-select');
    
    const renderPlayerProfile = (playerId) => {
        const player = playersStats.find(p => p.id_jugador === playerId);
        if (!player) {
            document.getElementById('player-profile-container').innerHTML = `<p>Selecciona un jugador para ver sus estadísticas.</p>`;
            return;
        }

        const setDifference = player.setsWon - player.setsLost;
        const gameDifference = player.gamesWon - player.gamesLost;

        const container = document.getElementById('player-profile-container');
        container.innerHTML = `
            <h3>Resumen de Rendimiento</h3>
            <p><strong>Puntos totales:</strong> ${player.totalPoints}</p>
            <p><strong>Puntos por partido:</strong> ${player.pointsPerMatch.toFixed(2)}</p>
            <p><strong>Partidos jugados:</strong> ${player.matchesPlayed}</p>
            <p><strong>Racha de victorias más larga:</strong> ${player.maxWinStreak}</p>
            <p><strong>Racha de derrotas más larga:</strong> ${player.maxLossStreak}</p>

            <hr>

            <h3>Detalle de Sets y Juegos</h3>
            <p><strong>Sets ganados:</strong> ${player.setsWon} / <strong>Sets perdidos:</strong> ${player.setsLost} (Diferencia: ${setDifference > 0 ? '+' : ''}${setDifference})</p>
            <p><strong>Juegos ganados:</strong> ${player.gamesWon} / <strong>Juegos perdidos:</strong> ${player.gamesLost} (Diferencia: ${gameDifference > 0 ? '+' : ''}${gameDifference})</p>

            <hr>

            ${getPartnerStatsHTML(player.id_jugador)}
            ${getRivalStatsHTML(player.id_jugador)}
        `;
    };
    
    const getPartnerStatsHTML = (playerId) => {
        const partnerStats = getPartnerStats(playerId);
        const sortedPartnerStats = partnerStats.sort((a, b) => b.pointsPerMatch - a.pointsPerMatch);
        return `
            <h3>Rendimiento con Parejas</h3>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>COMPA</th>
                        <th>P/P</th>
                        <th>V</th>
                        <th>D</th>
                        <th>E</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPartnerStats.map(stat => `
                        <tr>
                            <td>${stat.partnerName}</td>
                            <td>${stat.pointsPerMatch.toFixed(2)}</td>
                            <td>${stat.wins}</td>
                            <td>${stat.losses}</td>
                            <td>${stat.ties}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    const getRivalStatsHTML = (playerId) => {
        const rivalStats = getRivalStats(playerId);
        const sortedRivalStats = rivalStats.sort((a, b) => a.pointsPerMatch - b.pointsPerMatch);
        return `
            <h3>Rendimiento contra Rivales</h3>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Rival</th>
                        <th>P/P</th>
                        <th>V</th>
                        <th>D</th>
                        <th>E</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedRivalStats.map(stat => `
                        <tr>
                            <td>${stat.rivalName}</td>
                            <td>${stat.pointsPerMatch.toFixed(2)}</td>
                            <td>${stat.wins}</td>
                            <td>${stat.losses}</td>
                            <td>${stat.ties}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    const populatePlayerSelect = () => {
        playerSelect.innerHTML = '<option value="">Selecciona un jugador</option>' + 
            players.map(p => `<option value="${p.id_jugador}">${p.nombre}</option>`).join('');
    };

    playerSelect.addEventListener('change', (event) => {
        const selectedPlayerId = parseInt(event.target.value);
        if (selectedPlayerId) {
            renderPlayerProfile(selectedPlayerId);
        } else {
            document.getElementById('player-profile-container').innerHTML = '';
        }
    });

    const getPartnerStats = (playerId) => {
        const stats = new Map();
        const playerMatches = matches.filter(match => {
            const isSuspended = results.find(r => r.id_partido === match.id_partido)?.equipo_ganador === -1;
            if (isSuspended) return false;
            const playerInMatch = match_couples.some(mp => {
                const pair = couples.find(p => p.id_pareja === mp.id_pareja);
                return mp.id_partido === match.id_partido && (pair.id_jugador1 === playerId || pair.id_jugador2 === playerId);
            });
            return playerInMatch;
        });
        
        playerMatches.forEach(match => {
            const playerPair = couples.find(p => {
                const mp = match_couples.find(mp => mp.id_partido === match.id_partido && mp.id_pareja === p.id_pareja);
                return mp && (p.id_jugador1 === playerId || p.id_jugador2 === playerId);
            });
            if (!playerPair) return;
            
            const partnerId = playerPair.id_jugador1 === playerId ? playerPair.id_jugador2 : playerPair.id_jugador1;
            
            if (!stats.has(partnerId)) {
                stats.set(partnerId, { wins: 0, losses: 0, ties: 0, totalPoints: 0, matchesPlayed: 0 });
            }
            
            const matchResult = results.find(r => r.id_partido === match.id_partido);
            const playerTeam = match_couples.find(mp => mp.id_partido === match.id_partido && mp.id_pareja === playerPair.id_pareja)?.equipo;
            
            const currentStats = stats.get(partnerId);
            if (matchResult.equipo_ganador === playerTeam) currentStats.wins++;
            else if (matchResult.equipo_ganador === 0) currentStats.ties++;
            else currentStats.losses++;
            
            currentStats.totalPoints += calculatePlayerPoints(playerId, match.id_partido);
            currentStats.matchesPlayed++;
        });

        return Array.from(stats.keys()).map(id => {
            const partnerName = players.find(p => p.id_jugador == id).nombre;
            const currentStats = stats.get(id);
            return {
                partnerName,
                wins: currentStats.wins,
                losses: currentStats.losses,
                ties: currentStats.ties,
                pointsPerMatch: currentStats.matchesPlayed > 0 ? currentStats.totalPoints / currentStats.matchesPlayed : 0
            };
        });
    };

    const getRivalStats = (playerId) => {
        const stats = new Map();
        const playerMatches = matches.filter(match => {
            const isSuspended = results.find(r => r.id_partido === match.id_partido)?.equipo_ganador === -1;
            if (isSuspended) return false;
            const playerInMatch = match_couples.some(mp => {
                const pair = couples.find(p => p.id_pareja === mp.id_pareja);
                return mp.id_partido === match.id_partido && (pair.id_jugador1 === playerId || pair.id_jugador2 === playerId);
            });
            return playerInMatch;
        });

        playerMatches.forEach(match => {
            const playerCoupleData = match_couples.find(mp => {
                const pair = couples.find(p => p.id_pareja === mp.id_pareja);
                return mp.id_partido === match.id_partido && (pair.id_jugador1 === playerId || pair.id_jugador2 === playerId);
            });
            
            const playerTeam = playerCoupleData.equipo;
            const rivalTeam = playerTeam === 1 ? 2 : 1;
            
            const rivalCoupleData = match_couples.find(mp => mp.id_partido === match.id_partido && mp.equipo === rivalTeam);
            if (!rivalCoupleData) return;
            const rivalCouple = couples.find(p => p.id_pareja === rivalCoupleData.id_pareja);
            const rivalPlayer1Id = rivalCouple.id_jugador1;
            const rivalPlayer2Id = rivalCouple.id_jugador2;
            
            [rivalPlayer1Id, rivalPlayer2Id].forEach(rivalId => {
                if (!stats.has(rivalId)) {
                    stats.set(rivalId, { wins: 0, losses: 0, ties: 0, totalPoints: 0, matchesPlayed: 0 });
                }

                const currentStats = stats.get(rivalId);
                const matchResult = results.find(r => r.id_partido === match.id_partido);
                if (matchResult.equipo_ganador === playerTeam) currentStats.wins++;
                else if (matchResult.equipo_ganador === 0) currentStats.ties++;
                else currentStats.losses++;
                
                currentStats.totalPoints += calculatePlayerPoints(playerId, match.id_partido);
                currentStats.matchesPlayed++;
            });
        });

        return Array.from(stats.keys()).map(id => {
            const rivalName = players.find(p => p.id_jugador == id).nombre;
            const currentStats = stats.get(id);
            return {
                rivalName,
                wins: currentStats.wins,
                losses: currentStats.losses,
                ties: currentStats.ties,
                pointsPerMatch: currentStats.matchesPlayed > 0 ? currentStats.totalPoints / currentStats.matchesPlayed : 0
            };
        });
    };

    const getRankingEvolutionData = () => {
		const playerPoints = {};
		players.forEach(p => playerPoints[p.id_jugador] = 0);
		
		const playedMatches = matches.filter(match => {
			const result = results.find(r => r.id_partido === match.id_partido);
			return result && result.equipo_ganador !== -1;
		}).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

		const labels = Array.from({length: playedMatches.length}, (_, i) => `Partido ${i + 1}`);
		const datasets = {};
		players.forEach(p => {
			const color = getRandomColor(p.nombre);
			datasets[p.nombre] = {
				label: p.nombre,
				data: [],
				borderColor: color,
				backgroundColor: color,
				tension: 0.4
			};
		});

		const playerMatchesPlayed = {};
		players.forEach(p => playerMatchesPlayed[p.id_jugador] = 0);

		playedMatches.forEach(match => {
			const matchCouples = match_couples.filter(mp => mp.id_partido === match.id_partido);
			const playersInMatch = new Set();
			matchCouples.forEach(mp => {
				const couple = couples.find(c => c.id_pareja === mp.id_pareja);
				playersInMatch.add(couple.id_jugador1);
				playersInMatch.add(couple.id_jugador2);
			});

			playersInMatch.forEach(playerId => {
				const points = calculatePlayerPoints(playerId, match.id_partido);
				playerPoints[playerId] += points;
				playerMatchesPlayed[playerId]++; 
			});

			const currentRanking = players.map(p => {
				const matchesPlayed = playerMatchesPlayed[p.id_jugador];
				const avgPoints = matchesPlayed > 0 ? playerPoints[p.id_jugador] / matchesPlayed : 0;
				return {
					id: p.id_jugador,
					nombre: p.nombre,
					avgPoints: avgPoints
				};
			}).sort((a, b) => b.avgPoints - a.avgPoints);

			// Lógica actualizada para manejar empates en la clasificación de la gráfica
			let lastAvgPoints = null;
			let currentRank = 1;
			
			currentRanking.forEach((p, index) => {
				if (index > 0 && p.avgPoints < lastAvgPoints) {
					currentRank++;
				}
				lastAvgPoints = p.avgPoints;
				datasets[p.nombre].data.push(currentRank);
			});
		});
		
		return { labels, datasets: Object.values(datasets) };
	};

    const renderRankingEvolutionChart = () => {
        const rankingData = getRankingEvolutionData();
        const ctx = document.getElementById('rankingEvolutionChart').getContext('2d');
        
        if (window.rankingEvolutionChartInstance) {
            window.rankingEvolutionChartInstance.destroy();
        }

        window.rankingEvolutionChartInstance = new Chart(ctx, {
            type: 'line',
            data: rankingData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.5,
                scales: {
                    y: {
                        reverse: true,
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Clasificación'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Número de Partido'
                        },
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });
    };

    const renderMetrics = () => {
        const container = document.getElementById('metrics-container');
        const chartCanvas = document.getElementById('evolutionChart');
        
        renderRankingEvolutionChart();

        const allPlayedMatches = matches.filter(match => {
            const matchResult = results.find(r => r.id_partido === match.id_partido);
            return matchResult && matchResult.equipo_ganador !== -1;
        }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let totalSets = 0;
        let totalGames = 0;
        const labels = [];
        const avgSetsData = [];
        const avgGamesData = [];

        allPlayedMatches.forEach((match, index) => {
            const matchSets = sets.filter(s => s.id_partido === match.id_partido);
            totalSets += matchSets.length;
            matchSets.forEach(s => totalGames += (s.juegos_equipo1 + s.juegos_equipo2));
            
            const numMatches = index + 1;
            
            labels.push(`Partido ${numMatches}`);
            avgSetsData.push((totalSets / numMatches).toFixed(2));
            avgGamesData.push((totalGames / numMatches).toFixed(2));
        });

        if (window.metricsChartInstance) {
            window.metricsChartInstance.destroy();
        }

        if (allPlayedMatches.length > 0) {
            window.metricsChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Promedio de Sets por Partido',
                        data: avgSetsData,
                        borderColor: '#3f51b5',
                        backgroundColor: 'rgba(63, 81, 181, 0.2)',
                        tension: 0.1,
                        yAxisID: 'y'
                    }, {
                        label: 'Promedio de Juegos por Partido',
                        data: avgGamesData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        tension: 0.1,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            min: 0,
                            max: 3,
                            title: {
                                display: true,
                                text: 'Promedio de Sets'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 0,
                            max: 40,
                            grid: {
                                drawOnChartArea: false
                            },
                            title: {
                                display: true,
                                text: 'Promedio de Juegos'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Número de Partido'
                            },
                            ticks: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else {
            chartCanvas.style.display = 'none';
        }

        const allSets = sets.filter(s => {
            const matchResult = results.find(r => r.id_partido === s.id_partido);
            return matchResult && matchResult.equipo_ganador !== -1;
        });
        
        let maxGameDiffSet = { diff: 0, games: '', matchId: null };
        allSets.forEach(s => {
            const diff = Math.abs(s.juegos_equipo1 - s.juegos_equipo2);
            if (diff > maxGameDiffSet.diff) {
                maxGameDiffSet = { diff, games: `${s.juegos_equipo1}-${s.juegos_equipo2}`, matchId: s.id_partido };
            }
        });

        const matchWithMaxDiff = matches.find(m => m.id_partido === maxGameDiffSet.matchId);
        
        let playersWithMaxDiff = 'N/A';
        if (matchWithMaxDiff) {
            const matchCouplesData = match_couples.filter(mp => mp.id_partido === matchWithMaxDiff.id_partido);
            const couple1Data = matchCouplesData.find(mp => mp.equipo === 1);
            const couple2Data = matchCouplesData.find(mp => mp.equipo === 2);
            if (couple1Data && couple2Data) {
                const couple1 = couples.find(p => p.id_pareja === couple1Data.id_pareja);
                const couple2 = couples.find(p => p.id_pareja === couple2Data.id_pareja);
                const player1Names = `${players.find(p => p.id_jugador === couple1.id_jugador1)?.nombre} y ${players.find(p => p.id_jugador === couple1.id_jugador2)?.nombre}`;
                const player2Names = `${players.find(p => p.id_jugador === couple2.id_jugador1)?.nombre} y ${players.find(p => p.id_jugador === couple2.id_jugador2)?.nombre}`;
                playersWithMaxDiff = `${player1Names} vs ${player2Names}`;
            }
        }

        const playerWithMostMatches = playersStats.sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0];
        const allWinStreaks = playersStats.map(p => p.maxWinStreak);
        const maxWinStreak = Math.max(...allWinStreaks);
        const playerWithMaxWinStreak = playersStats.find(p => p.maxWinStreak === maxWinStreak);

        const allLossStreaks = playersStats.map(p => p.maxLossStreak);
        const maxLossStreak = Math.max(...allLossStreaks);
        const playerWithMaxLossStreak = playersStats.find(p => p.maxLossStreak === maxLossStreak);
        
        let pairsPlayedCount = {};
        match_couples.forEach(mp => {
            const matchResult = results.find(r => r.id_partido === mp.id_partido);
            if (!matchResult || matchResult.equipo_ganador === -1) return;
            
            const pair = couples.find(p => p.id_pareja === mp.id_pareja);
            const pairKey = [pair.id_jugador1, pair.id_jugador2].sort().join('-');
            pairsPlayedCount[pairKey] = (pairsPlayedCount[pairKey] || 0) + 1;
        });

        const mostPlayedPairKey = Object.keys(pairsPlayedCount).sort((a, b) => pairsPlayedCount[b] - pairsPlayedCount[a])[0];
        const mostPlayedPairIds = mostPlayedPairKey ? mostPlayedPairKey.split('-') : [null, null];
        const mostPlayedPairNames = mostPlayedPairIds.map(id => players.find(p => p.id_jugador == id)?.nombre).join(' y ');
        
        const mostPlayedPairs = Object.entries(pairsPlayedCount)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([key, count]) => {
                const [id1, id2] = key.split('-');
                return {
                    name1: players.find(p => p.id_jugador == id1)?.nombre,
                    name2: players.find(p => p.id_jugador == id2)?.nombre,
                    count
                };
            });

        const playedPairsKeys = new Set(Object.keys(pairsPlayedCount));
        const allPossiblePairs = [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const key = [players[i].id_jugador, players[j].id_jugador].sort().join('-');
                if (!playedPairsKeys.has(key)) {
                    allPossiblePairs.push({ name1: players[i].nombre, name2: players[j].nombre });
                }
            }
        }

        container.innerHTML = `
            <h3>Curiosidades y Récords</h3>
            <ul>
                <li><strong>Mayor diferencia de juegos en un set:</strong> ${maxGameDiffSet.diff} juegos (${maxGameDiffSet.games}) en el partido del ${matchWithMaxDiff ? matchWithMaxDiff.fecha : 'N/A'}. Jugadores: ${playersWithMaxDiff}</li>
                <li><strong>Jugador con más partidos jugados:</strong> ${playerWithMostMatches ? playerWithMostMatches.nombre : 'N/A'} (${playerWithMostMatches ? playerWithMostMatches.matchesPlayed : 0} partidos)</li>
                <li><strong>Pareja con más partidos jugados:</strong> ${mostPlayedPairNames ? mostPlayedPairNames : 'N/A'} (${pairsPlayedCount[mostPlayedPairKey] || 0} partidos)</li>
                <li><strong>Racha de victorias más larga:</strong> ${playerWithMaxWinStreak ? playerWithMaxWinStreak.nombre : 'N/A'} con ${maxWinStreak} partidos.</li>
                <li><strong>Racha de derrotas más larga:</strong> ${playerWithMaxLossStreak ? playerWithMaxLossStreak.nombre : 'N/A'} con ${maxLossStreak} partidos.</li>
            </ul>

            <h3>Parejas Habituales</h3>
            <div id="habitual-pairs-table" class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Pareja</th>
                            <th>Partidos Jugados</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mostPlayedPairs.map(p => `
                            <tr>
                                <td>${p.name1} y ${p.name2}</td>
                                <td>${p.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h3>Parejas por estrenar</h3>
            <div id="unplayed-pairs-list">
                <ul>
                    ${allPossiblePairs.map(p => `<li>${p.name1} y ${p.name2}</li>`).join('')}
                </ul>
            </div>
        `;
    };

    const monthFilter = document.getElementById('month-filter');
    const playerFilter = document.getElementById('player-filter');
    const resultFilter = document.getElementById('result-filter');
    const historyContainer = document.getElementById('history-container');

    const renderHistory = () => {
        const selectedPlayerId = playerFilter.value;
        playerFilter.innerHTML = '<option value="">Todos los jugadores</option>' + players.map(p => `<option value="${p.id_jugador}">${p.nombre}</option>`).join('');
        playerFilter.value = selectedPlayerId;

        const filteredMatches = matches.filter(match => {
            const matchDate = new Date(match.fecha);
            const matchMonth = matchDate.getMonth() + 1;
            const selectedMonth = monthFilter.value;
            const selectedResult = resultFilter.value;

            const matchResult = results.find(r => r.id_partido === match.id_partido);
            const isSuspended = matchResult?.equipo_ganador === -1;
            if (isSuspended) return false;

            if (selectedMonth && matchMonth != selectedMonth) return false;

            let playerTeam = null;
            if (selectedPlayerId) {
                const playerIdInt = parseInt(selectedPlayerId);
                const playerCoupleData = match_couples.find(mp => {
                    const pair = couples.find(p => p.id_pareja === mp.id_pareja);
                    return mp.id_partido === match.id_partido && (pair.id_jugador1 === playerIdInt || pair.id_jugador2 === playerIdInt);
                });

                if (!playerCoupleData) return false;
                playerTeam = playerCoupleData.equipo;
            }

            if (selectedResult) {
                if (selectedPlayerId) {
                    const isPlayerWinner = matchResult.equipo_ganador === playerTeam;
                    const isPlayerTie = matchResult.equipo_ganador === 0;

                    if (selectedResult === 'won' && !isPlayerWinner) return false;
                    if (selectedResult === 'tied' && !isPlayerTie) return false;
                    if (selectedResult === 'lost' && (isPlayerWinner || isPlayerTie)) return false;

                } else {
                    if (selectedResult === 'won' && matchResult.equipo_ganador === 0) return false;
                    if (selectedResult === 'tied' && matchResult.equipo_ganador !== 0) return false;
                    if (selectedResult === 'lost' && matchResult.equigo_ganador === 0) return false;
                }
            }
            
            return true;
        });

        const tableContent = filteredMatches.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(match => {
            const matchCouplesData = match_couples.filter(mp => mp.id_partido === match.id_partido);
            const couple1Data = matchCouplesData.find(mp => mp.equipo === 1);
            const couple2Data = matchCouplesData.find(mp => mp.equipo === 2);
            
            if (!couple1Data || !couple2Data) {
                return '';
            }

            const couple1 = couples.find(p => p.id_pareja === couple1Data.id_pareja);
            const couple2 = couples.find(p => p.id_pareja === couple2Data.id_pareja);
            
            const player1Pair1 = players.find(p => p.id_jugador === couple1.id_jugador1).nombre;
            const player2Pair1 = players.find(p => p.id_jugador === couple1.id_jugador2).nombre;
            const player1Pair2 = players.find(p => p.id_jugador === couple2.id_jugador1).nombre;
            const player2Pair2 = players.find(p => p.id_jugador === couple2.id_jugador2).nombre;

            const matchSets = sets.filter(s => s.id_partido === match.id_partido);
            const result = matchSets.map(s => `${s.juegos_equipo1}-${s.juegos_equipo2}`).join(', ');

            const matchResult = results.find(r => r.id_partido === match.id_partido);
            let winnerText = 'Empate';
            if (matchResult.equipo_ganador === 1) winnerText = 'Equipo 1';
            if (matchResult.equipo_ganador === 2) winnerText = 'Equipo 2';
            if (matchResult.equipo_ganador === -1) winnerText = 'Suspendido';
            
            const playerPoints = {};
            const playersInMatch = [
                couple1.id_jugador1, couple1.id_jugador2,
                couple2.id_jugador1, couple2.id_jugador2
            ];
            playersInMatch.forEach(pId => {
                playerPoints[pId] = calculatePlayerPoints(pId, match.id_partido);
            });
            const pointsText = playersInMatch.map(pId => `${players.find(p => p.id_jugador === pId).nombre}: ${playerPoints[pId]} pts`).join(', ');

            return `
                <tr>
                    <td data-label="Fecha">${match.fecha}</td>
                    <td data-label="Equipos">${player1Pair1} y ${player2Pair1} vs ${player1Pair2} y ${player2Pair2}</td>
                    <td data-label="Resultado Final">${result}</td>
                    <td data-label="Resultado del Partido">${winnerText}</td>
                    <td data-label="Puntos del Partido">${pointsText}</td>
                </tr>
            `;
        }).join('');

        historyContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Equipos</th>
                        <th>Resultado Final</th>
                        <th>Resultado del Partido</th>
                        <th>Puntos del Partido</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableContent || '<tr><td colspan="5">No se encontraron partidos.</td></tr>'}
                </tbody>
            </table>
        `;
    };

    monthFilter.addEventListener('change', renderHistory);
    playerFilter.addEventListener('change', renderHistory);
    resultFilter.addEventListener('change', renderHistory);

    renderRanking();
    populatePlayerSelect();
});