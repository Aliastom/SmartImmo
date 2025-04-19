'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérifiez votre email</CardTitle>
          <CardDescription>
            Un email de confirmation a été envoyé à votre adresse email.
            Veuillez cliquer sur le lien dans l&apos;email pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Si vous n&apos;avez pas reçu l&apos;email, vérifiez votre dossier spam
              ou contactez notre support.
            </p>
            <div className="flex justify-center">
              <Link href="/auth/login">
                <Button variant="outline">
                  Retour à la page de connexion
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
