const db = require('../config/db');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { bucket } = require("../config/firebase");
const { Readable } = require('stream');
const os = require('os');

ffmpeg.setFfmpegPath("E:/DỰ ÁN TỐT NGHIỆP/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe");
ffmpeg.setFfprobePath("E:/DỰ ÁN TỐT NGHIỆP/ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe");

class MixModel {
    // Phân tích audio để lấy thông tin
    static async analyzeAudio(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, data) => {
                if (err) reject(err);

                // Tìm stream audio
                const audioStream = data.streams.find(stream => stream.codec_type === 'audio');

                if (!audioStream) {
                    reject(new Error('Không tìm thấy audio stream'));
                    return;
                }

                // Phân tích audio
                const analysis = {
                    duration: audioStream.duration,
                    sampleRate: audioStream.sample_rate,
                    channels: audioStream.channels,
                    bitRate: audioStream.bit_rate,
                    codec: audioStream.codec_name,
                    volume: this.calculateVolume(data),
                    frequencyResponse: this.analyzeFrequencyResponse(data)
                };

                resolve(analysis);
            });
        });
    }

    // Tính toán volume trung bình
    static calculateVolume(probeData) {
        try {
            const audioStream = probeData.streams.find(stream => stream.codec_type === 'audio');
            // Lấy volume từ metadata nếu có
            const volumeFromMeta = audioStream?.tags?.REPLAYGAIN_TRACK_GAIN;
            if (volumeFromMeta) {
                return parseFloat(volumeFromMeta);
            }
            // Giá trị mặc định nếu không có thông tin
            return -18;
        } catch (error) {
            console.error('Error calculating volume:', error);
            return -18; // Giá trị mặc định an toàn
        }
    }

    // Phân tích phổ tần số
    static analyzeFrequencyResponse(probeData) {
        try {
            // Phân tích dải tần từ metadata nếu có
            const audioStream = probeData.streams.find(stream => stream.codec_type === 'audio');
            const freqResponse = audioStream?.tags?.FREQUENCY_RESPONSE;

            if (freqResponse) {
                return freqResponse.split(',').map(Number);
            }

            // Trả về mảng mô phỏng dải tần nếu không có dữ liệu thực
            return [
                { freq: 20, response: 0.8 },    // Sub-bass
                { freq: 60, response: 0.85 },   // Bass
                { freq: 250, response: 0.9 },   // Low-mids
                { freq: 1000, response: 0.95 }, // Mids
                { freq: 4000, response: 0.9 },  // High-mids
                { freq: 12000, response: 0.85 }, // Highs
                { freq: 20000, response: 0.8 }  // Ultra-highs
            ];
        } catch (error) {
            console.error('Error analyzing frequency response:', error);
            return [];
        }
    }

    // Tính toán các thông số mix tối ưu
    static calculateOptimalMixSettings(audioAnalysis) {
        const settings = {
            volume: 1.0,
            bassBoost: 0,
            trebleBoost: 0,
            delay: 0
        };

        // Điều chỉnh volume dựa trên phân tích
        if (audioAnalysis.volume < -24) {
            settings.volume = 1.2; // Tăng volume cho track nhỏ
        } else if (audioAnalysis.volume > -12) {
            settings.volume = 0.8; // Giảm volume cho track lớn
        }

        // Phân tích và điều chỉnh bass
        const bassResponse = audioAnalysis.frequencyResponse.find(f => f.freq === 60)?.response || 0.85;
        if (bassResponse < 0.8) {
            settings.bassBoost = 3; // Tăng bass nếu thiếu
        } else if (bassResponse > 0.9) {
            settings.bassBoost = -2; // Giảm bass nếu thừa
        }

        // Phân tích và điều chỉnh treble
        const trebleResponse = audioAnalysis.frequencyResponse.find(f => f.freq === 12000)?.response || 0.85;
        if (trebleResponse < 0.8) {
            settings.trebleBoost = 2; // Tăng treble nếu thiếu
        } else if (trebleResponse > 0.9) {
            settings.trebleBoost = -1; // Giảm treble nếu thừa
        }

        return settings;
    }
    static matchSongMoods(song1, song2) {
        // Tính toán độ tương đồng về tâm trạng
        const moodSimilarity = this.calculateMoodCompatibility(song1, song2);

        // Điều chỉnh mix dựa trên độ tương đồng
        return {
            transitionSmoothnessScore: moodSimilarity,
            recommendedTransitionStyle: moodSimilarity > 0.7 ? 'smooth' : 'dynamic'
        };
    }
    static blendGenres(song1, song2) {
        const genreCompatibilityMatrix = {
            'pop-rock': 0.8,
            'electronic-indie': 0.7,
            'hip-hop-jazz': 0.6
        };

        const genrePair = `${song1.genre}-${song2.genre}`;
        const blendScore = genreCompatibilityMatrix[genrePair] || 0.5;

        return {
            blendCompatibility: blendScore,
            recommendedMixTechnique: blendScore > 0.7 ? 'seamless' : 'contrast'
        };
    }
    static applySmoothTransition(command, songs) {
        // Nếu không có logic cụ thể, chỉ trả về command gốc
        return command;
    }
    // Phương thức chính để mix nhạc
    static async createMix(songs, userMixSettings = {}, transitionStyle = 'smooth', mixTitle = null) {
        // Auto-generate title if not provided
        if (!mixTitle && songs.length >= 2) {
            mixTitle = `${songs[0].title} x ${songs[1].title}`;
        }
    
        const tempDir = os.tmpdir();
        const defaultFileName = `mix_${Date.now()}.mp3`;
        const outputFileName = mixTitle
            ? `${mixTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.mp3`
            : defaultFileName;
        const outputPath = path.join(tempDir, outputFileName);
        const transitionEffects = {
            'smooth': this.applySmoothTransition,
            'dynamic': this.applyDynamicTransition,
            'contrast': this.applyContrastTransition
        };

        // Khởi tạo command trước khi sử dụng
        let command = ffmpeg();

        // Áp dụng hiệu ứng chuyển đoạn
        const transitionHandler = transitionEffects[transitionStyle] || transitionEffects['smooth'];
        command = transitionHandler(command, songs);

        try {
            // Download songs từ Firebase
            const downloadPromises = songs.map(async (song, index) => {
                const tempFile = path.join(tempDir, `song_${index}.mp3`);
                const songPath = song.file_song.replace('https://storage.googleapis.com/be-musicheals-a6d7a.appspot.com/', '');
                const file = bucket.file(songPath);
                await file.download({ destination: tempFile });
                return tempFile;
            });

            const songPaths = await Promise.all(downloadPromises);

            // Phân tích từng bài hát
            const audioAnalyses = await Promise.all(
                songPaths.map(path => this.analyzeAudio(path))
            );

            // Tính toán settings tối ưu cho từng track
            const optimalSettings = audioAnalyses.map(analysis =>
                this.calculateOptimalMixSettings(analysis)
            );

            // Kết hợp settings tự động với settings của user
            const finalSettings = optimalSettings.map((optimal, index) => ({
                ...optimal,
                ...userMixSettings[index]
            }));

            // Tạo ffmpeg command
            let command = ffmpeg();

            // Thêm input files
            songPaths.forEach(songPath => {
                command = command.input(songPath);
            });

            // Tạo filter complex string
            const filterComplex = songPaths.map((_, index) => {
                const settings = finalSettings[index];

                return [
                    // Chuẩn hóa format audio
                    `[${index}:a]aresample=48000,aformat=sample_fmts=fltp[fmt${index}]`,

                    // Xử lý bass
                    `[fmt${index}]equalizer=f=100:t=q:w=1:g=${settings.bassBoost}[bass${index}]`,

                    // Xử lý mid frequencies
                    `[bass${index}]equalizer=f=1000:t=q:w=1:g=1[mid${index}]`,

                    // Xử lý treble
                    `[mid${index}]equalizer=f=8000:t=q:w=1:g=${settings.trebleBoost}[treble${index}]`,

                    // Compression để kiểm soát dynamic range
                    `[treble${index}]compand=attacks=0.02:decays=0.5:points=-80/-80|-45/-45|-27/-25|0/-10:soft-knee=6:gain=2[comp${index}]`,

                    // Điều chỉnh volume
                    `[comp${index}]volume=${settings.volume}[vol${index}]`,

                    // Thêm delay nếu cần
                    `[vol${index}]adelay=${settings.delay}|${settings.delay}[a${index}]`
                ].join(';');
            }).join(';');

            // Thêm phần mix vào filter complex
            const mixInputs = songPaths.map((_, index) => `[a${index}]`).join('');
            const finalFilter = `${filterComplex};${mixInputs}amix=inputs=${songPaths.length}:duration=longest:weights=${songPaths.map(() => '1').join(' ')
                }[premix];` +

                // Chuỗi xử lý cuối cùng
                '[premix]' +
                'highpass=f=20,lowpass=f=20000,' + // Lọc tần số cực đoan
                'asubboost,' + // Tăng cường sub-bass
                'stereotools=mlev=1:slev=1:sbal=0,' + // Tăng cường stereo
                'dynaudnorm=p=0.9:m=100:s=12:g=15,' + // Chuẩn hóa dynamic range
                'loudnorm=I=-14:LRA=11:TP=-1[outa]'; // Chuẩn hóa loudness

            // Thực thi mix với settings chất lượng cao
            await new Promise((resolve, reject) => {
                command
                    .complexFilter(finalFilter)
                    .map('[outa]')
                    .audioFrequency(48000)
                    .audioBitrate('320k')
                    .audioChannels(2)
                    .audioCodec('libmp3lame')
                    .audioQuality(0) // Chất lượng cao nhất
                    .format('mp3')
                    .save(outputPath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            // Upload kết quả lên Firebase
            const uploadResponse = await bucket.upload(outputPath, {
                destination: `songs/mixes/${outputFileName}`,
                metadata: {
                    contentType: 'audio/mpeg',
                }
            });

            const [url] = await uploadResponse[0].getSignedUrl({
                action: 'read',
                expires: '03-01-2500'
            });

            // Dọn dẹp file tạm
            [...songPaths, outputPath].forEach(file => {
                try {
                    fs.unlinkSync(file);
                } catch (error) {
                    console.error(`Error deleting temp file ${file}:`, error);
                }
            });

            // Lưu thông tin mix vào database
            const query = `
                INSERT INTO song_mixes (
                    title,
                    file_path,
                    created_at
                ) VALUES (?, ?, NOW())
            `;

            const [result] = await db.execute(query, [
                mixTitle || outputFileName,
                url
            ]);

            const mixId = result.insertId;

            // Lưu thông tin chi tiết của từng bài hát trong mix
            await Promise.all(songs.map((song, index) => {
                return db.execute(
                    'INSERT INTO mix_songs (mix_id, song_id, volume, sequence) VALUES (?, ?, ?, ?)',
                    [mixId, song.id, finalSettings[index].volume, index]
                );
            }));

            // Trả về kết quả
            return {
                id: mixId,
                title: outputFileName,
                file_path: url,
                songs: songs.map((song, index) => ({
                    ...song,
                    ...finalSettings[index],
                    sequence: index
                }))
            };

        } catch (error) {
            // Xử lý lỗi và dọn dẹp
            console.error('Mix error:', error);
            fs.readdirSync(tempDir)
                .filter(file => file.startsWith('song_') || file.startsWith('mix_'))
                .forEach(file => {
                    try {
                        fs.unlinkSync(path.join(tempDir, file));
                    } catch (err) {
                        console.error(`Error deleting temp file ${file}:`, err);
                    }
                });
            throw error;
        }
    }
    static async getAllMixes() {
        const query = `
            SELECT m.*, 
                   GROUP_CONCAT(s.id) as song_ids,
                   GROUP_CONCAT(s.title) as song_titles,
                   GROUP_CONCAT(ms.volume) as volumes,
                   GROUP_CONCAT(ms.sequence) as sequences
            FROM song_mixes m
            LEFT JOIN mix_songs ms ON m.id = ms.mix_id
            LEFT JOIN songs s ON ms.song_id = s.id
            GROUP BY m.id
            ORDER BY m.created_at DESC
        `;

        const [rows] = await db.execute(query);

        return rows.map(mix => {
            const songIds = mix.song_ids ? mix.song_ids.split(',') : [];
            const songTitles = mix.song_titles ? mix.song_titles.split(',') : [];
            const volumes = mix.volumes ? mix.volumes.split(',').map(Number) : [];
            const sequences = mix.sequences ? mix.sequences.split(',').map(Number) : [];

            return {
                id: mix.id,
                title: mix.title,
                file_path: mix.file_path,
                created_at: mix.created_at,
                songs: songIds.map((id, index) => ({
                    id,
                    title: songTitles[index],
                    volume: volumes[index],
                    sequence: sequences[index]
                }))
            };
        });
    }
    // Trong updateMixSettings
    static adjustVolumeDynamically(currentVolume, songCharacteristics) {
        // Tự động điều chỉnh volume dựa trên đặc điểm bài hát
        const volumeMap = {
            'soft': 1.2,   // Nhạc êm dịu
            'loud': 0.7,   // Nhạc mạnh
            'balanced': 1.0 // Nhạc cân bằng
        };

        return songCharacteristics.volume
            ? volumeMap[songCharacteristics.volume]
            : currentVolume;
    }
    static optimizeEqualizer(currentSettings, genreAnalysis) {
        const genreEqPresets = {
            'rock': { bass: 3, mid: 1, treble: 2 },
            'classical': { bass: -1, mid: 0, treble: 1 },
            'electronic': { bass: 4, mid: 2, treble: 3 }
        };

        return genreEqPresets[genreAnalysis.genre]
            || currentSettings;
    }
    static smoothTransition(songs) {
        // Phân tích và làm mượt điểm chuyển đoạn
        return songs.map((song, index) => {
            if (index > 0) {
                // Tìm điểm chuyển đoạn tối ưu
                const transitionPoint = this.findBestTransitionPoint(
                    songs[index - 1],
                    song
                );
                return { ...song, transitionPoint };
            }
            return song;
        });
    }

    static async deleteMix(mixId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Get mix details with file path and related songs
            const [mixRows] = await connection.execute(
                'SELECT * FROM song_mixes WHERE id = ?',
                [mixId]
            );

            if (!mixRows.length) {
                return false;
            }

            const mix = mixRows[0];
            const mixFilePath = mix.file_path;

            // Delete mix file from Firebase
            if (mixFilePath) {
                try {
                    const filePathParts = mixFilePath.split('com/');
                    const cleanFilePath = filePathParts.length > 1 ? filePathParts[1] : mixFilePath;
            
                    // Check and delete mix file
                    const mixFile = bucket.file(`songs/mixes/${path.basename(cleanFilePath)}`);
                    const [exists] = await mixFile.exists();
            
                    if (exists) {
                        await mixFile.delete();
                        console.log(`Mix file ${cleanFilePath} deleted from Firebase`);
                    }
                } catch (firebaseError) {
                    console.error('Firebase deletion error:', firebaseError);
                }
            }

            // Delete related songs from mix_songs
            await connection.execute(
                'DELETE FROM mix_songs WHERE mix_id = ?',
                [mixId]
            );

            // Delete mix entry
            await connection.execute(
                'DELETE FROM song_mixes WHERE id = ?',
                [mixId]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Delete mix error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    // Lấy thông tin mix theo ID
    static async getMixById(id) {
        const query = `
            SELECT m.*, 
                   GROUP_CONCAT(s.id) as song_ids,
                   GROUP_CONCAT(s.title) as song_titles,
                   GROUP_CONCAT(ms.volume) as volumes,
                   GROUP_CONCAT(ms.sequence) as sequences
            FROM song_mixes m
            LEFT JOIN mix_songs ms ON m.id = ms.mix_id
            LEFT JOIN songs s ON ms.song_id = s.id
            WHERE m.id = ?
            GROUP BY m.id
        `;

        const [rows] = await db.execute(query, [id]);
        if (!rows.length) return null;

        const mix = rows[0];
        const songIds = mix.song_ids ? mix.song_ids.split(',') : [];
        const songTitles = mix.song_titles ? mix.song_titles.split(',') : [];
        const volumes = mix.volumes ? mix.volumes.split(',').map(Number) : [];
        const sequences = mix.sequences ? mix.sequences.split(',').map(Number) : [];

        return {
            id: mix.id,
            title: mix.title,
            file_path: mix.file_path,
            created_at: mix.created_at,
            songs: songIds.map((id, index) => ({
                id,
                title: songTitles[index],
                volume: volumes[index],
                sequence: sequences[index]
            }))
        };
    }
}

module.exports = MixModel;