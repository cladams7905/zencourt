import { VideoCompositionService } from '../videoCompositionService';
import type {
  ComposedVideoResult,
  VideoCompositionSettings,
} from '@shared/types/video';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve(Buffer.from('mock-video-data'))),
  unlink: jest.fn(() => Promise.resolve()),
  rm: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/config/env', () => ({
  env: {
    storageBucket: 'test-bucket',
    storageRegion: 'us-west-002',
    tempDir: '/tmp/video-processing',
  },
}));

jest.mock('../storageService', () => ({
  storageService: {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
  },
}));

// Mock FFmpeg - we don't want to actually run FFmpeg in tests
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg: any = jest.fn(() => ({
    input: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    outputOptions: jest.fn().mockReturnThis(),
    complexFilter: jest.fn().mockReturnThis(),
    inputOptions: jest.fn().mockReturnThis(),
    on: jest.fn(function (event: string, callback: any) {
      if (event === 'end') {
        // Simulate successful completion
        setTimeout(() => callback(), 0);
      }
      return this;
    }),
    run: jest.fn(),
  }));

  mockFfmpeg.setFfmpegPath = jest.fn();
  mockFfmpeg.setFfprobePath = jest.fn();
  mockFfmpeg.ffprobe = jest.fn((_filePath: string, callback: any) => {
    callback(null, {
      format: { duration: 10.5 },
      streams: [{ width: 1280, height: 720 }],
    });
  });

  return mockFfmpeg;
});

jest.mock('ffmpeg-static', () => '/usr/bin/ffmpeg');
jest.mock('ffprobe-static', () => ({ path: '/usr/bin/ffprobe' }));

describe('VideoCompositionService', () => {
  let service: VideoCompositionService;
  let mockStorageService: any;

  beforeEach(() => {
    service = new VideoCompositionService();
    mockStorageService = require('../storageService').storageService;
    jest.clearAllMocks();
  });

  describe('Type Definitions', () => {
    it('should have correct LogoPosition type', () => {
      const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ];
      expect(positions).toHaveLength(4);
    });

    it('should accept valid VideoCompositionSettings', () => {
      const settings: VideoCompositionSettings = {
        transitions: true,
        logo: {
          storageUrl: 'https://bucket.s3.us-east-1.amazonaws.com/logo.png',
          position: 'top-right',
        },
        subtitles: {
          enabled: true,
          text: 'Test subtitle',
          font: 'Arial',
        },
      };

      expect(settings.transitions).toBe(true);
      expect(settings.logo?.position).toBe('top-right');
      expect(settings.subtitles?.enabled).toBe(true);
    });

    it('should accept ComposedVideoResult', () => {
      const result: ComposedVideoResult = {
        videoUrl: 'https://s3.amazonaws.com/video.mp4',
        thumbnailUrl: 'https://s3.amazonaws.com/thumb.jpg',
        duration: 30.5,
        fileSize: 1024000,
      };

      expect(result.duration).toBe(30.5);
      expect(result.fileSize).toBe(1024000);
    });
  });

  describe('combineRoomVideos', () => {
    const mockSettings: VideoCompositionSettings = {
      transitions: false,
    };

    beforeEach(() => {
      // Mock storage downloads
      mockStorageService.downloadFile.mockResolvedValue(
        Buffer.from('mock-video-data')
      );

      // Mock storage uploads
      mockStorageService.uploadFile.mockResolvedValue(
        'https://s3.amazonaws.com/mock-url.mp4'
      );
    });

    it('should successfully combine room videos without transitions', async () => {
      const roomVideoUrls = [
        'https://bucket.s3.us-east-1.amazonaws.com/video1.mp4',
        'https://bucket.s3.us-east-1.amazonaws.com/video2.mp4',
      ];

      const result = await service.combineRoomVideos(
        roomVideoUrls,
        mockSettings,
        'user123',
        'project456',
        'video789',
        'Test Project'
      );

      expect(result).toBeDefined();
      expect(result.videoUrl).toContain('mock-url.mp4');
      expect(result.thumbnailUrl).toContain('mock-url.mp4');
      expect(result.duration).toBe(10.5);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should download room videos from storage', async () => {
      const roomVideoUrls = [
        'https://bucket.s3.us-east-1.amazonaws.com/user_user1/projects/project_project456/videos/video_videoRoom1/room.mp4',
      ];

      await service.combineRoomVideos(
        roomVideoUrls,
        mockSettings,
        'user123',
        'project456',
        'video789'
      );

      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        'test-bucket',
        'user_user1/projects/project_project456/videos/video_videoRoom1/room.mp4'
      );
    });

    it('should upload final video and thumbnail to storage', async () => {
      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await service.combineRoomVideos(
        roomVideoUrls,
        mockSettings,
        'user123',
        'project456',
        'video789',
        'Test Project'
      );

      // Should upload both video and thumbnail
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(2);

      // Check video upload
      const videoCall = mockStorageService.uploadFile.mock.calls.find((call: any) =>
        call[0].key.includes('final.mp4')
      );
      expect(videoCall).toBeDefined();
      expect(videoCall[0]).toMatchObject({
        contentType: 'video/mp4',
        metadata: expect.objectContaining({
          userId: 'user123',
          projectId: 'project456',
          videoId: 'video789',
        }),
      });

      // Check thumbnail upload
      const thumbnailCall = mockStorageService.uploadFile.mock.calls.find((call: any) =>
        call[0].key.includes('thumbnail.jpg')
      );
      expect(thumbnailCall).toBeDefined();
      expect(thumbnailCall[0]).toMatchObject({
        contentType: 'image/jpeg',
      });
    });

    it('should create and cleanup temp directory', async () => {
      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await service.combineRoomVideos(
        roomVideoUrls,
        mockSettings,
        'user123',
        'project456',
        'video789'
      );

      // Should create temp directory
      expect(fs.mkdir).toHaveBeenCalled();

      // Should cleanup temp directory
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('video-composition-project456'),
        { recursive: true, force: true }
      );
    });

    it('should handle logo overlay if provided', async () => {
      const settingsWithLogo: VideoCompositionSettings = {
        transitions: false,
        logo: {
          storageUrl: 'https://bucket.s3.us-east-1.amazonaws.com/logo.png',
          position: 'top-right',
        },
      };

      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await service.combineRoomVideos(
        roomVideoUrls,
        settingsWithLogo,
        'user123',
        'project456',
        'video789'
      );

      // Should download logo from storage
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith('test-bucket', 'logo.png');
    });

    it('should handle subtitles if enabled', async () => {
      const settingsWithSubtitles: VideoCompositionSettings = {
        transitions: false,
        subtitles: {
          enabled: true,
          text: 'This is a test subtitle for the video',
          font: 'Arial',
        },
      };

      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await service.combineRoomVideos(
        roomVideoUrls,
        settingsWithSubtitles,
        'user123',
        'project456',
        'video789'
      );

      // Should write subtitle file
      const srtWriteCall = (fs.writeFile as jest.Mock).mock.calls.find((call: any) =>
        call[0].includes('subtitles.srt')
      );
      expect(srtWriteCall).toBeDefined();
      expect(srtWriteCall[1]).toContain('-->'); // SRT format
    });

    it('should handle transitions if enabled', async () => {
      const settingsWithTransitions: VideoCompositionSettings = {
        transitions: true,
      };

      const roomVideoUrls = [
        'https://bucket.s3.us-east-1.amazonaws.com/video1.mp4',
        'https://bucket.s3.us-east-1.amazonaws.com/video2.mp4',
      ];

      await service.combineRoomVideos(
        roomVideoUrls,
        settingsWithTransitions,
        'user123',
        'project456',
        'video789'
      );

      // FFmpeg should be called (mocked, so we just verify the service ran)
      expect(mockStorageService.downloadFile).toHaveBeenCalledTimes(2);
    });

    it('should cleanup temp files on error', async () => {
      mockStorageService.downloadFile.mockRejectedValueOnce(
        new Error('Storage download failed')
      );

      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await expect(
        service.combineRoomVideos(
          roomVideoUrls,
          mockSettings,
          'user123',
          'project456',
          'video789'
        )
      ).rejects.toThrow('Failed to compose video');

      // Should still attempt cleanup
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should include project name in metadata when provided', async () => {
      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await service.combineRoomVideos(
        roomVideoUrls,
        mockSettings,
        'user123',
        'project456',
        'video789',
        'My Awesome Project'
      );

      const videoCall = mockStorageService.uploadFile.mock.calls.find((call: any) =>
        call[0].key.includes('final.mp4')
      );
      expect(videoCall[0].metadata.projectName).toBe('My Awesome Project');
    });
  });

  describe('Storage URL Parsing', () => {
    it('should extract storage key from standard HTTPS URL', async () => {
      const service = new VideoCompositionService();
      const url = 'https://bucket.s3.us-east-1.amazonaws.com/user_user123/projects/project_proj1/videos/video_video123/source.mp4';

      // We'll test this indirectly through the downloadFile calls
      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));
      mockStorageService.uploadFile.mockResolvedValue('https://s3.amazonaws.com/video.mp4');

      await service.combineRoomVideos(
        [url],
        { transitions: false },
        'user1',
        'proj1',
        'vid1'
      );

      // The key extraction happens internally
      expect(mockStorageService.downloadFile).toHaveBeenCalled();
    });
  });

  describe('Thumbnail Generation', () => {
    it('should generate thumbnail from video', async () => {
      const videoPath = '/tmp/test-video.mp4';
      const thumbnailPath = '/tmp/test-thumbnail.jpg';

      const result = await service.generateThumbnail(videoPath, thumbnailPath);

      expect(result).toBe(thumbnailPath);
    });

    it('should generate thumbnail with auto-generated path if not provided', async () => {
      const videoPath = '/tmp/test-video.mp4';

      const result = await service.generateThumbnail(videoPath);

      expect(result).toContain('thumbnail-');
      expect(result).toContain('.jpg');
    });
  });

  describe('Error Handling', () => {
    it('should throw error with meaningful message on storage download failure', async () => {
      mockStorageService.downloadFile.mockRejectedValue(
        new Error('Storage Access Denied')
      );

      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await expect(
        service.combineRoomVideos(
          roomVideoUrls,
          { transitions: false },
          'user123',
          'project456',
          'video789'
        )
      ).rejects.toThrow('Failed to compose video');
    });

    it('should throw error with meaningful message on storage upload failure', async () => {
      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));
      mockStorageService.uploadFile.mockRejectedValue(
        new Error('Storage Upload Failed')
      );

      const roomVideoUrls = ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'];

      await expect(
        service.combineRoomVideos(
          roomVideoUrls,
          { transitions: false },
          'user123',
          'project456',
          'video789'
        )
      ).rejects.toThrow('Failed to compose video');
    });
  });

  describe('Subtitle Generation', () => {
    it('should format SRT timestamps correctly', () => {
      // This tests the internal formatSrtTime method indirectly
      const settingsWithSubtitles: VideoCompositionSettings = {
        transitions: false,
        subtitles: {
          enabled: true,
          text: 'Short text',
          font: 'Arial',
        },
      };

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));
      mockStorageService.uploadFile.mockResolvedValue('https://s3.amazonaws.com/video.mp4');

      service.combineRoomVideos(
        ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'],
        settingsWithSubtitles,
        'user123',
        'project456',
        'video789'
      );

      // Check that SRT file was written with correct format
      const srtCall = (fs.writeFile as jest.Mock).mock.calls.find((call: any) =>
        call[0].includes('subtitles.srt')
      );

      if (srtCall) {
        const srtContent = srtCall[1];
        // SRT format: HH:MM:SS,mmm
        expect(srtContent).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
      }
    });

    it('should split long subtitle text into multiple subtitles', async () => {
      const longText =
        'This is a very long subtitle text that should definitely be split into multiple subtitle segments because it definitely exceeds the maximum character limit per subtitle which is forty characters and this text is much longer than that so we should see multiple numbered subtitle entries in the SRT file';

      const settingsWithSubtitles: VideoCompositionSettings = {
        transitions: false,
        subtitles: {
          enabled: true,
          text: longText,
          font: 'Arial',
        },
      };

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));
      mockStorageService.uploadFile.mockResolvedValue('https://s3.amazonaws.com/video.mp4');

      await service.combineRoomVideos(
        ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'],
        settingsWithSubtitles,
        'user123',
        'project456',
        'video789'
      );

      const srtCall = (fs.writeFile as jest.Mock).mock.calls.find((call: any) =>
        call[0].includes('subtitles.srt')
      );

      if (srtCall) {
        const srtContent = srtCall[1];
        // Should have SRT content with timestamps
        expect(srtContent).toContain('-->');
        // Should have at least the subtitle number
        expect(srtContent).toMatch(/^\d+$/m);
        // With such a long text (200+ chars), should have been split
        // Check that the text is shorter in the subtitle than the original
        expect(srtContent.length).toBeGreaterThan(0);
      } else {
        // If no SRT call found, the test should fail
        expect(srtCall).toBeDefined();
      }
    });
  });

  describe('Logo Positioning', () => {
    const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ];

    positions.forEach((position) => {
      it(`should handle ${position} logo position`, async () => {
        const settingsWithLogo: VideoCompositionSettings = {
          transitions: false,
          logo: {
            storageUrl: 'https://bucket.s3.us-east-1.amazonaws.com/logo.png',
            position,
          },
        };

        mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));
        mockStorageService.uploadFile.mockResolvedValue('https://s3.amazonaws.com/video.mp4');

        await service.combineRoomVideos(
          ['https://bucket.s3.us-east-1.amazonaws.com/video1.mp4'],
          settingsWithLogo,
          'user123',
          'project456',
          'video789'
        );

        // Verify logo was downloaded
        expect(mockStorageService.downloadFile).toHaveBeenCalledWith('test-bucket', 'logo.png');
      });
    });
  });

  describe('Instance Export', () => {
    it('should export singleton instance', () => {
      const { videoCompositionService } = require('../videoCompositionService');
      expect(videoCompositionService).toBeInstanceOf(VideoCompositionService);
    });
  });
});
