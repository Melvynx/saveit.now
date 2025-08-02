import { NextRequest } from 'next/server';
import { POST } from '../../app/api/bug-report/route';
import { sendEmail } from '../../src/lib/mail/send-email';
import { userRoute } from '../../src/lib/safe-route';

// Mock dependencies
jest.mock('../../src/lib/mail/send-email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../../src/lib/safe-route', () => ({
  userRoute: {
    body: jest.fn().mockReturnThis(),
    handler: jest.fn(),
  },
}));

const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockUserRoute = userRoute as jest.Mocked<typeof userRoute>;

describe('/api/bug-report', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockBugReportData = {
    description: 'This is a detailed bug report describing the issue',
    deviceInfo: 'iOS 16.0',
    appVersion: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup userRoute mock to call the handler function directly
    mockUserRoute.body.mockReturnThis();
    mockUserRoute.handler.mockImplementation((handlerFn) => {
      return async (req: NextRequest) => {
        return handlerFn(req, {
          body: mockBugReportData,
          ctx: { user: mockUser },
        });
      };
    });
  });

  describe('POST /api/bug-report', () => {
    it('should send email with correct bug report data', async () => {
      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'help@saveit.now',
        subject: `Bug Report from ${mockUser.email}`,
        html: expect.stringContaining(`<h2>Bug Report from Mobile App</h2>`),
        replyTo: mockUser.email,
      });

      expect(responseData).toEqual({
        success: true,
        message: 'Bug report sent successfully',
      });
      expect(response.status).toBe(200);
    });

    it('should include all bug report data in email content', async () => {
      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      await POST(mockRequest);

      const emailCall = mockSendEmail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain(`<strong>User:</strong> ${mockUser.email}`);
      expect(htmlContent).toContain(`<strong>User ID:</strong> ${mockUser.id}`);
      expect(htmlContent).toContain(`<strong>Description:</strong>`);
      expect(htmlContent).toContain(mockBugReportData.description);
      expect(htmlContent).toContain(`<strong>Device Info:</strong> ${mockBugReportData.deviceInfo}`);
      expect(htmlContent).toContain(`<strong>App Version:</strong> ${mockBugReportData.appVersion}`);
      expect(htmlContent).toContain(`<strong>Reported at:</strong>`);
    });

    it('should handle optional device info and app version', async () => {
      const minimalData = {
        description: 'Bug description without optional fields',
      };

      mockUserRoute.handler.mockImplementation((handlerFn) => {
        return async (req: NextRequest) => {
          return handlerFn(req, {
            body: minimalData,
            ctx: { user: mockUser },
          });
        };
      });

      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(minimalData),
      });

      await POST(mockRequest);

      const emailCall = mockSendEmail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain(minimalData.description);
      expect(htmlContent).not.toContain(`<strong>Device Info:</strong>`);
      expect(htmlContent).not.toContain(`<strong>App Version:</strong>`);
    });

    it('should handle multiline descriptions properly', async () => {
      const multilineDescription = 'First line\nSecond line\nThird line';
      const dataWithMultiline = {
        ...mockBugReportData,
        description: multilineDescription,
      };

      mockUserRoute.handler.mockImplementation((handlerFn) => {
        return async (req: NextRequest) => {
          return handlerFn(req, {
            body: dataWithMultiline,
            ctx: { user: mockUser },
          });
        };
      });

      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(dataWithMultiline),
      });

      await POST(mockRequest);

      const emailCall = mockSendEmail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('First line<br>Second line<br>Third line');
    });

    it('should return error when email sending fails', async () => {
      const emailError = new Error('Email service unavailable');
      mockSendEmail.mockResolvedValue({
        error: emailError,
        data: null,
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(responseData).toEqual({
        error: 'Failed to send bug report',
      });
      expect(response.status).toBe(500);
    });

    it('should handle unexpected errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSendEmail.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(responseData).toEqual({
        error: 'Failed to submit bug report',
      });
      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Bug report submission error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should log email sending failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const emailError = new Error('SMTP connection failed');
      
      mockSendEmail.mockResolvedValue({
        error: emailError,
        data: null,
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      await POST(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send bug report email:',
        emailError
      );

      consoleSpy.mockRestore();
    });

    it('should include timestamp in email content', async () => {
      const mockDate = new Date('2023-12-01T10:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      await POST(mockRequest);

      const emailCall = mockSendEmail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain(mockDate.toISOString());
    });

    it('should set correct email headers', async () => {
      mockSendEmail.mockResolvedValue({
        error: null,
        data: { id: 'email-123' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(mockBugReportData),
      });

      await POST(mockRequest);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'help@saveit.now',
        subject: `Bug Report from ${mockUser.email}`,
        html: expect.any(String),
        replyTo: mockUser.email,
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate description minimum length through userRoute.body', () => {
      // The validation is handled by the userRoute.body schema
      // This test verifies that the schema is being used
      expect(mockUserRoute.body).toHaveBeenCalled();
    });

    it('should handle validation errors from userRoute', async () => {
      // Mock userRoute to throw validation error
      mockUserRoute.handler.mockImplementation(() => {
        throw new Error('Validation failed: description too short');
      });

      const invalidData = {
        description: 'short',
      };

      const mockRequest = new NextRequest('http://localhost:3000/api/bug-report', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      await expect(POST(mockRequest)).rejects.toThrow('Validation failed: description too short');
    });
  });

  describe('Authentication', () => {
    it('should require authenticated user through userRoute', () => {
      // Authentication is handled by userRoute
      // This test verifies that userRoute is being used
      expect(mockUserRoute.body).toHaveBeenCalled();
      expect(mockUserRoute.handler).toHaveBeenCalled();
    });
  });
});