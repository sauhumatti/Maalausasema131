import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      name,
      phone,
      email,
      message,
      preference,
      resultImage,
      color,
      intensity,
      threshold,
      backgroundRemoved,
      selectedBackgroundPath,
    } = data;

    // Basic Validation
    if (!name || !phone || !email || !preference || !resultImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Email transporter configured correctly.');
    } catch (verifyError) {
      console.error('Error verifying email transporter:', verifyError);
      return NextResponse.json({ error: 'Email server configuration error.' }, { status: 500 });
    }

    // Prepare image attachment
    let imageAttachment = undefined;
    if (resultImage.startsWith('data:image/png;base64,')) {
      const base64Data = resultImage.replace(/^data:image\/png;base64,/, "");
      imageAttachment = {
        filename: 'vanne-esikatselu.png',
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'image/png'
      };
    } else {
      console.warn("Received resultImage is not a PNG data URL. Skipping attachment.");
    }

    // Email content
    const subject = `Uusi Vanteen Maalaus Kysely - ${name}`;
    const textBody = `
      Uusi vanteen maalauskysely vastaanotettu:

      Nimi: ${name}
      Puhelin: ${phone}
      Sähköposti: ${email}
      Haluaa yhteydenoton: ${preference === 'call' ? 'Puhelimitse' : 'Sähköpostitse'}

      Vanteen asetukset:
      Väri: ${color}
      Voimakkuus: ${intensity}%
      Tunnistuksen tarkkuus (Threshold): ${threshold}
      Tausta poistettu: ${backgroundRemoved ? 'Kyllä' : 'Ei'}
      Valittu taustakuva: ${selectedBackgroundPath || 'Ei valittu / Ei käytössä'}
      ${message ? `\nLisäviesti:\n${message}\n` : ''}

      Katso liitteenä oleva esikatselukuva.
    `;
    const htmlBody = `
      <html>
        <body>
          <h2>Uusi vanteen maalauskysely</h2>
          <p><strong>Nimi:</strong> ${name}</p>
          <p><strong>Puhelin:</strong> ${phone}</p>
          <p><strong>Sähköposti:</strong> ${email}</p>
          <p><strong>Haluaa yhteydenoton:</strong> ${preference === 'call' ? 'Puhelimitse' : 'Sähköpostitse'}</p>
          <hr>
          <h3>Vanteen asetukset:</h3>
          <p><strong>Väri:</strong> <span style="display: inline-block; width: 20px; height: 20px; background-color: ${color}; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;"></span> ${color}</p>
          <p><strong>Voimakkuus:</strong> ${intensity}%</p>
          <p><strong>Tunnistuksen tarkkuus (Threshold):</strong> ${threshold}</p>
          <p><strong>Tausta poistettu:</strong> ${backgroundRemoved ? 'Kyllä' : 'Ei'}</p>
          <p><strong>Valittu taustakuva:</strong> ${selectedBackgroundPath || 'Ei valittu / Ei käytössä'}</p>
          ${message ? `
          <hr>
          <h3>Lisäviesti:</h3>
          <p style="white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          ` : ''}
          <hr>
          <p>Katso liitteenä oleva esikatselukuva.</p>
          ${imageAttachment ? '<p><img src="cid:unique-preview-image" alt="Vanne-esikatselu" style="max-width: 400px; height: auto;"/></p>' : '<p><i>Esikatselukuvaa ei voitu liittää.</i></p>'}
        </body>
      </html>
    `;

    // Send mail with defined transport object
    await transporter.sendMail({
      from: process.env.EMAIL_FROM_ADDRESS,
      to: process.env.COMPANY_EMAIL_ADDRESS,
      subject: subject,
      text: textBody,
      html: htmlBody,
      attachments: imageAttachment ? [{...imageAttachment, cid: 'unique-preview-image'}] : [],
    });

    console.log('Quote request email sent successfully');
    return NextResponse.json({ message: 'Quote request sent successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Error processing quote request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send quote request.', details: errorMessage }, { status: 500 });
  }
}